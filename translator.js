function convert(inoContent, projectName) {
    let rootCMakeList = `cmake_minimum_required(VERSION 3.16)\ninclude($ENV{IDF_PATH}/tools/cmake/project.cmake)\nproject(${projectName})\n`;
    
    let requires = [];
    let includes = [
        '#include <stdio.h>',
        '#include <string.h>',
        '#include "freertos/FreeRTOS.h"',
        '#include "freertos/task.h"',
        '#include "driver/gpio.h"'
    ];

    let beforeMain = [];
    let insideMainStart = [];
    
    // WiFi parsing
    if (inoContent.includes('<WiFi.h>')) {
        requires.push('esp_wifi', 'nvs_flash', 'esp_event', 'esp_netif', 'lwip');
        includes.push('#include "esp_wifi.h"', '#include "nvs_flash.h"', '#include "esp_event.h"', '#include "esp_netif.h"', '#include "lwip/err.h"', '#include "lwip/sys.h"');
        
        inoContent = inoContent.replace(/#include\s*<WiFi\.h>/g, '');
        
        beforeMain.push(`
// WiFi Event Handler
static void wifi_event_handler(void* arg, esp_event_base_t event_base,
                                    int32_t event_id, void* event_data) {
    if (event_base == WIFI_EVENT && event_id == WIFI_EVENT_STA_START) {
        esp_wifi_connect();
    } else if (event_base == WIFI_EVENT && event_id == WIFI_EVENT_STA_DISCONNECTED) {
        esp_wifi_connect();
        printf("Retrying connection to the AP\\n");
    } else if (event_base == IP_EVENT && event_id == IP_EVENT_STA_GOT_IP) {
        ip_event_got_ip_t* event = (ip_event_got_ip_t*) event_data;
        printf("Got IP: " IPSTR "\\n", IP2STR(&event->ip_info.ip));
    }
}

void wifi_init_sta(void) {
    esp_netif_init();
    esp_event_loop_create_default();
    esp_netif_create_default_wifi_sta();
    wifi_init_config_t cfg = WIFI_INIT_CONFIG_DEFAULT();
    esp_wifi_init(&cfg);
    esp_event_handler_instance_t instance_any_id;
    esp_event_handler_instance_t instance_got_ip;
    esp_event_handler_instance_register(WIFI_EVENT, ESP_EVENT_ANY_ID, &wifi_event_handler, NULL, &instance_any_id);
    esp_event_handler_instance_register(IP_EVENT, IP_EVENT_STA_GOT_IP, &wifi_event_handler, NULL, &instance_got_ip);
    esp_wifi_set_mode(WIFI_MODE_STA);
    esp_wifi_start();
}
`);
        inoContent = inoContent.replace(/WiFi\.begin\((.*?),\s*(.*?)\);/g, (match, ssid, pass) => {
            return `
    wifi_config_t wifi_config = {};
    // Temporary cast to avoid C++ string literal warning in C++ compilation, 
    // but works best if user provided char* variables.
    strncpy((char*)wifi_config.sta.ssid, ${ssid}, sizeof(wifi_config.sta.ssid));
    strncpy((char*)wifi_config.sta.password, ${pass}, sizeof(wifi_config.sta.password));
    
    esp_wifi_set_config(WIFI_IF_STA, &wifi_config);
`;
        });

        insideMainStart.push(`
    // Initialize NVS
    esp_err_t ret = nvs_flash_init();
    if (ret == ESP_ERR_NVS_NO_FREE_PAGES || ret == ESP_ERR_NVS_NEW_VERSION_FOUND) {
      ESP_ERROR_CHECK(nvs_flash_erase());
      ret = nvs_flash_init();
    }
    ESP_ERROR_CHECK(ret);
    
    wifi_init_sta();
`);
    }

    // Convert core Arduino functions across the entire file
    let convertedCode = inoContent;
    // Replace HIGH and LOW
    convertedCode = convertedCode.replace(/\bHIGH\b/g, '1');
    convertedCode = convertedCode.replace(/\bLOW\b/g, '0');

    // Replace pinMode
    convertedCode = convertedCode.replace(/pinMode\((.*?),\s*OUTPUT\);/g, 'gpio_set_direction((gpio_num_t)$1, GPIO_MODE_OUTPUT);');
    convertedCode = convertedCode.replace(/pinMode\((.*?),\s*INPUT\);/g, 'gpio_set_direction((gpio_num_t)$1, GPIO_MODE_INPUT);');
    convertedCode = convertedCode.replace(/pinMode\((.*?),\s*INPUT_PULLUP\);/g, 'gpio_set_direction((gpio_num_t)$1, GPIO_MODE_INPUT); gpio_set_pull_mode((gpio_num_t)$1, GPIO_PULLUP_ONLY);');
    
    // Replace digitalWrite and Read
    convertedCode = convertedCode.replace(/digitalWrite\((.*?),\s*(.*?)\);/g, 'gpio_set_level((gpio_num_t)$1, $2);');
    convertedCode = convertedCode.replace(/digitalRead\((.*?)\)/g, 'gpio_get_level((gpio_num_t)$1)');
    
    // Replace delay
    convertedCode = convertedCode.replace(/delay\((.*?)\);/g, 'vTaskDelay($1 / portTICK_PERIOD_MS);');
    
    // Replace Serial
    convertedCode = convertedCode.replace(/Serial\.begin\((.*?)\);/g, '// Serial.begin ignored');
    // Using simple regex for string replacing, this will only work properly for simple strings
    convertedCode = convertedCode.replace(/Serial\.println\((.*?)\);/g, 'printf("%s\\n", (const char*)$1);'); 
    convertedCode = convertedCode.replace(/Serial\.print\((.*?)\);/g, 'printf("%s", (const char*)$1);');

    // Assemble main.cpp
    let mainC = includes.join('\n') + '\n\n';
    mainC += beforeMain.join('\n') + '\n\n';
    mainC += convertedCode + '\n\n'; 
    
    // app_main needs to be C linkage
    mainC += 'extern "C" void app_main(void) {\n';
    mainC += insideMainStart.join('\n');
    mainC += '    setup();\n';
    mainC += '    while(1) {\n';
    mainC += '        loop();\n';
    mainC += '        vTaskDelay(10 / portTICK_PERIOD_MS);\n';
    mainC += '    }\n';
    mainC += '}\n';

    // Assemble main/CMakeLists.txt
    let cmakeList = 'idf_component_register(SRCS "main.cpp"\n';
    cmakeList += '                    INCLUDE_DIRS ".")\n';
    if (requires.length > 0) {
        cmakeList = cmakeList.replace(')', `\n                    REQUIRES ${requires.join(' ')})`);
    }

    return { mainC, cmakeList, rootCMakeList };
}
