# Welcome to your Expo app 👋

## To start frontend (development build)

1. Install dependencies

   ```bash
   npm install
   ```

2. Start the app

   ```bash
   npx expo start
   ```

## To start backend

1. install requirements

   ```bash
   pip install -r requirements.txt
   ```

2. run command

   ```bash
   uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
   ```

## To start NGROK

1. install NGROK

   [Link Text](https://ngrok.com/download/windows)

2. run command

   ```bash
   ngrok http 8000
   ```

## To build an APK

1. run this command

   ```bash
   eas build --platform android --profile preview --clear-cache
   ```
