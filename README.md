# ФитПуть Mobile

Expo / React Native приложение для FitJourney.

## Быстрый старт

1. Установите зависимости:

```bash
npm install
```

2. Создайте `.env` из шаблона:

```bash
copy .env.example .env
```

3. Заполните Firebase public variables и URL web/API сервера.

4. Запустите приложение:

```bash
npm start
```

## Переменные окружения

`EXPO_PUBLIC_API_URL` должен указывать на web/backend проект FitJourney:

- телефон в той же Wi-Fi сети: `http://YOUR_PC_IP:9002`
- Android emulator: `http://10.0.2.2:9002`
- local web preview: `http://localhost:9002`
- production: URL задеплоенного сайта

Firebase admin private key не должен храниться в mobile-приложении. Он нужен только web/backend репозиторию.

## Структура

- `app/` - экраны Expo Router
- `context/AuthContext.tsx` - авторизация и профиль
- `lib/firebase.ts` - Firebase client
- `lib/api.ts` - запросы к web API
