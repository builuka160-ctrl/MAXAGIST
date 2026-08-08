# MAXAGIST — массаж в Риге

Лендинг массажной практики **MAXAGIST**. Студия FIFTY и выезд на дом,
в отель или офис по Риге. Первый визит — €30.

Сайт статический: один файл `index.html` со встроенными стилями и
скриптами плюс изображения в `photos/`. Внешних зависимостей нет, кроме
шрифтов Google Fonts.

## Структура

```
index.html         — вся страница (HTML + CSS + JS в одном файле)
photos/            — фотографии студии, работ и логотип
  ├─ logo.png
  ├─ studio-room.jpg, spa-tools.jpg, massage-*.jpg …
  ├─ diploma-riseba.jpg, cert-spaschool.jpg
  └─ certs/         — сертификаты и дипломы
```

## Локальный просмотр

Достаточно открыть `index.html` в браузере. Для корректной загрузки
изображений удобнее поднять локальный сервер:

```bash
python3 -m http.server 8000
# затем открыть http://localhost:8000
```

## Публикация (GitHub Pages)

Репозиторий готов к раздаче через GitHub Pages:

1. **Settings → Pages**
2. **Source:** Deploy from a branch
3. **Branch:** `main` / `/ (root)`

Точка входа — `index.html`, сайт откроется на корневом URL.

## Контакты

Запись — в WhatsApp или через форму на сайте.
