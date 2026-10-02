# DonDomi - Guía de Operaciones y Validación Comercial (Valledupar)

## 1. Conexión Real a Base de Datos en la Nube
La plataforma ahora cuenta con **persistencia real en Supabase (PostgreSQL)**:
- **Proyecto:** `https://axnpjyjyziehwwvykrex.supabase.co`
- **Tablas configuradas:**
  - `restaurants`: Comercios en Valledupar, teléfonos WhatsApp, horarios, comisión pactada y tarifas base.
  - `products`: Menús 100% textuales con categorías, precios en COP y adiciones extras.
  - `orders`: Registro de pedidos con suscripción en tiempo real (*Supabase Realtime*).

---

## 2. Direcciones de Acceso

### En tu red local Wi-Fi:
- **Cliente:** `http://192.168.40.4:3000`
- **Administrador:** `http://192.168.40.4:3000/admin`
- **Cocina / Restaurante:** `http://192.168.40.4:3000/merchant`
- **Domiciliario:** `http://192.168.40.4:3000/driver`

### Para visualizar remotamente con Ngrok:
En tu consola de comandos (CMD o PowerShell) ejecuta:
```cmd
ngrok http 3000
```
Y comparte la URL `https://xxxx.ngrok-free.app` que te entrega en pantalla.

---

## 3. Protocolo para Afiliar Restaurantes en Valledupar
1. Visita al restaurante con tu teléfono o tablet.
2. Ingresa a `/admin`.
3. Haz clic en **"Afiliar Nuevo Restaurante"**:
   - Ingresa nombre, barrio de Valledupar (Novalito, Los Cortijos, Centro, etc.), dirección y número de WhatsApp de pedidos.
   - Define la comisión acordada (ej. 14% - 15%).
4. Haz clic en **"Menú"** en la tarjeta del restaurante para ingresar sus platos textuales:
   - Nombre del plato, categoría, precio y adiciones separadas por coma (ej. `Papas extra: 4000, Suero costeño: 2500, Queso frito: 3500`).
5. El restaurante queda inmediatamente disponible para todos los clientes en la web.
