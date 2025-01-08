// Параметры MQTT-брокера (WebSocket)
const MQTT_BROKER_URL = "ws://192.168.0.18:8083/mqtt"; // Адрес WebSocket
const MQTT_USERNAME   = "admin";
const MQTT_PASSWORD   = "admin76767676";
const MQTT_TOPIC_BUTTON = "esp32/button";
const MQTT_TOPIC_DISPLAY = "esp32/display";
const MQTT_TOPIC_UPDATE = "esp32/update";
const MQTT_TOPIC_STATUS = "esp32/status";

// DOM-элементы
const ledStatusEl = document.getElementById("ledStatus");
const toggleBtn   = document.getElementById("toggleBtn");
const line1El     = document.getElementById("line1");
const line2El     = document.getElementById("line2");

// Создаём клиент MQTT.js
const client = mqtt.connect(MQTT_BROKER_URL, {
  username: MQTT_USERNAME,
  password: MQTT_PASSWORD,
});

// При успешном подключении
client.on("connect", () => {
  console.log("Соединение с MQTT по WebSocket установлено!");
  // Подписываемся на топик для LED и кнопки
  client.subscribe(MQTT_TOPIC_BUTTON, (err) => {
    if (!err) {
      console.log(`Подписка на топик "${MQTT_TOPIC_BUTTON}" оформлена`);
    } else {
      console.error(`Ошибка подписки на "${MQTT_TOPIC_BUTTON}": ${err}`);
    }
  });

  // Подписываемся на топик для дисплея, если требуется получать обновления
  client.subscribe(MQTT_TOPIC_DISPLAY, (err) => {
    if (!err) {
      console.log(`Подписка на топик "${MQTT_TOPIC_DISPLAY}" оформлена`);
    } else {
      console.error(`Ошибка подписки на "${MQTT_TOPIC_DISPLAY}": ${err}`);
    }
  });

  client.subscribe(MQTT_TOPIC_STATUS, (err) => {
    if (!err) {
      console.log(`Подписка на топик "${MQTT_TOPIC_STATUS}" оформлена`);
    } else {
      console.error(`Ошибка подписки на "${MQTT_TOPIC_STATUS}": ${err}`);
    }
  });

  const message = {
    msg: "Update request..."
  };
  client.publish(MQTT_TOPIC_UPDATE, JSON.stringify(message))
  console.log("Запрос на обновление:", message);
});

// При получении сообщений с ESP32
client.on("message", (topic, payload) => {
  console.log(`Получено сообщение в топике "${topic}":\n${payload}`);
  if (topic === MQTT_TOPIC_BUTTON) {
    try {
      // Пытаемся распарсить JSON
      const data = JSON.parse(payload);
      const isLedActive = data.isLedActive;

      // Обновляем отображение статуса LED
      updateLedStatus(isLedActive);
    } catch (err) {
      console.error("Ошибка парсинга JSON:", err);
    }
  } else if (topic === MQTT_TOPIC_DISPLAY) {
    try {
      const data = JSON.parse(payload);
      const line1 = data.line1 || "";
      const line2 = data.line2 || "";

      // Обновляем текстовые поля, если требуется
      line1El.value = line1;
      line2El.value = line2;
    } catch (err) {
      console.error("Ошибка парсинга JSON для дисплея:", err);
    }
  } else if (topic === MQTT_TOPIC_STATUS)
  {
    console.log(`Получены данные из топика "${MQTT_TOPIC_STATUS}"`);
    try {
        const data = JSON.parse(payload);
        const isLedActive = data.isLedActive;
        const line1 = data.line1 || "";
        const line2 = data.line2 || "";
  
        // Обновляем текстовые поля, если требуется
        line1El.value = line1;
        line2El.value = line2;
        updateLedStatus(isLedActive);
      } catch (err) {
        console.error("Ошибка парсинга JSON для дисплея:", err);
      }
  }
});

// При ошибках
client.on("error", (error) => {
  console.error("Ошибка MQTT-клиента:", error);
});

// При разрыве соединения
client.on("close", () => {
  console.warn("Соединение с MQTT-брокером закрыто.");
});

// Обработчик нажатия на кнопку "Переключить LED"
toggleBtn.addEventListener("click", () => {
  // Получаем текущий статус LED из класса элемента
  const currentStatus = ledStatusEl.classList.contains("on");
  const newStatus = !currentStatus;

  const message = {
    isLedActive: newStatus
  };

  // Публикуем JSON в топик для кнопки
  client.publish(MQTT_TOPIC_BUTTON, JSON.stringify(message));
  console.log("Отправлен запрос на переключение LED:", message);
});

// Дебаунсинг функция
function debounce(func, delay) {
  let debounceTimer;
  return function(...args) {
    const context = this;
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => func.apply(context, args), delay);
  };
}

// Обработчики изменения текстовых полей с дебаунсингом (300ms)
line1El.oninput = sendDisplayData;
line2El.oninput = sendDisplayData;

// Функция для отправки данных на дисплей
function sendDisplayData() {
  const line1 = line1El.value.substring(0, 16); // Ограничиваем 16 символами
  const line2 = line2El.value.substring(0, 16); // Ограничиваем 16 символами

  const message = {
    line1: line1,
    line2: line2
  };

  // Публикуем JSON в топик для дисплея
  client.publish(MQTT_TOPIC_DISPLAY, JSON.stringify(message));
  console.log("Отправлены данные на дисплей:", message);
}

// Функция для обновления статуса светодиода
function updateLedStatus(isOn) {
  if (isOn) {
    ledStatusEl.textContent = "Включён";
    ledStatusEl.classList.add("on");
  } else {
    ledStatusEl.textContent = "Выключен";
    ledStatusEl.classList.remove("on");
  }
}
