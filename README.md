# ENTRELE

Juego diario de palabras en español: cada intento reduce un intervalo alfabético
hasta encontrar la respuesta de cinco letras.

## Funcionamiento

- La partida ofrece diez intentos válidos.
- Los intentos inválidos, repetidos o fuera del intervalo no consumen oportunidades.
- Cada intento válido indica su cercanía porcentual a la respuesta.
- La palabra diaria se calcula usando el día civil de `America/Santiago`.
- Actualmente la aplicación utiliza un diccionario reducido de prueba.

## Desarrollo

```bash
npm install
npm run dev
```

## Validación

```bash
npm run lint
npm run typecheck
npm run test
npm run build
```
