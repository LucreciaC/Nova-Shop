# Manual de Usuario — NOVA Shop (UCH-FyD)

**Universidad Champagnat — Facultad de Informática y Diseño**  
**Cátedra: Arquitectura de Sistemas — Grupo N.° 10**

---

## 1. Introducción

Bienvenido al **Manual de Usuario de NOVA Shop**, la plataforma de comercio electrónico de **UCH-FyD**. Este documento explica paso a paso cómo utilizar todas las funcionalidades del sistema tanto desde el rol de **Cliente** como desde el rol de **Administrador**.

### Acceso al Sistema
- **URL Principal de la Tienda**: [`http://localhost:3000`](http://localhost:3000)
- **Inicio de Sesión y Registro**: [`http://localhost:3000/login`](http://localhost:3000/login)

---

## 2. Flujo para Clientes

### 2.1. Exploración del Catálogo, Categorías y Ofertas (`RF-05`, `RF-06`)
*(No requiere iniciar sesión)*

1. Al ingresar a [`http://localhost:3000`](http://localhost:3000), verás el catálogo de productos disponibles con su **nombre, código, precio unitario y stock actual**.
2. **Buscador en tiempo real**: En la barra superior podés escribir el nombre, código (ej. `A-1001`) o categoría de cualquier artículo para filtrarlo instantáneamente.
3. **Sección Categorías** ([`http://localhost:3000/categorias`](http://localhost:3000/categorias)): Permite explorar los productos agrupados por rubro tecnológico (*Informática, Audio, Gaming, Hogar y Accesorios*).
4. **Sección Ofertas** ([`http://localhost:3000/ofertas`](http://localhost:3000/ofertas)): Muestra los artículos promocionados con su porcentaje de descuento (`% OFF`) y precio anterior tachado.
5. **Detalle de un Producto**: Haciendo clic sobre cualquier tarjeta de producto se abre su vista detallada (`/producto/[codigo]`), donde podés ver sus especificaciones técnicas, reseñas, stock disponible en tiempo real y elegir la cantidad a agregar al carrito.

---

### 2.2. Registro de una Nueva Cuenta (`RF-01`, `RF-02`)

1. Hacé clic en el ícono de usuario en la esquina superior derecha o ingresá a [`http://localhost:3000/login`](http://localhost:3000/login).
2. Seleccioná el botón **"Registrate como nuevo usuario (RF-01 / RF-02)"**.
3. Completá los datos solicitados:
   - **Nombre de usuario único** (ej. `camila_uch`)
   - **Correo electrónico** (ej. `camila@uch.edu.ar`)
   - **Nombre y Apellido**
   - **Contraseña**
4. Presioná **"Registrarme (Estado Inactivo - RF-02)"**.
5. **Importante**: Por regla de negocio de seguridad (`RF-02`), todas las cuentas nuevas se crean inicialmente en estado **`INACTIVO`**. Si intentás iniciar sesión antes de que un administrador te active, el sistema rechazará el ingreso informando que la cuenta está pendiente de activación (`HTTP 403 Forbidden`).

---

### 2.3. Inicio de Sesión (`RF-03`)

1. Una vez que un Administrador haya activado tu cuenta, ingresá a [`http://localhost:3000/login`](http://localhost:3000/login).
2. Ingresá tu **nombre de usuario o email** y tu **contraseña**.
3. Hacé clic en **"Ingresar"**.
4. Tu nombre de usuario aparecerá en la barra superior con un indicador verde de sesión activa.

---

### 2.4. Carrito de Compras y Confirmación de Pedido (`RF-07` a `RF-11`)

1. Desde el catálogo o desde la página de detalle de un producto, hacé clic en el botón violeta **"Agregar al carrito"**.
2. Se abrirá el panel lateral **"Mi carrito"**, donde podés:
   - Aumentar (`+`) o disminuir (`−`) la cantidad de unidades de cada artículo.
   - Eliminar un artículo con el ícono de papelera.
   - Verificar el **Subtotal** calculado automáticamente.
3. Hacé clic en **"Finalizar compra"**:
   - El sistema enviará el pedido al **Servidor de Ventas** a través del **API Gateway** junto con una clave única de idempotencia (`Idempotency-Key`) para evitar compras duplicadas si hacés doble clic.
   - El servidor verificará y descontará el stock en **PostgreSQL** de forma atómica.
   - Si hay stock suficiente, aparecerá el cartel **"¡Pedido confirmado!"** con tu número de comprobante (`#NV-...`) y el stock se actualizará inmediatamente en el catálogo.
   - Si otro usuario compró las últimas unidades al mismo instante y el stock no alcanza, el sistema mostrará una alerta clara (`409 Conflict`) sin generar cobros ni pedidos parciales.

---

### 2.5. Consulta de Mis Pedidos (`RF-07`, `RF-08`)

1. Con tu sesión iniciada, hacé clic en **"Mis Pedidos"** en la barra de navegación ([`http://localhost:3000/pedidos`](http://localhost:3000/pedidos)).
2. Verás el listado de todas tus compras confirmadas con fecha, hora, detalle de artículos, cantidades, precios unitarios e importe total.
3. Haciendo clic en **"Ver detalle"** dentro de cualquier pedido, se consulta individualmente el comprobante (`GET /api/v1/pedidos/{numero}`) y se despliega en pantalla.

---

## 3. Flujo para Administradores

### 3.1. Activación de Usuarios Pendientes (`RF-04`)

1. Iniciá sesión en [`http://localhost:3000/login`](http://localhost:3000/login) con una cuenta de rol **Administrador** (por ejemplo, usuario `admin`).
2. Serás redirigido automáticamente a **Admin Usuarios** ([`http://localhost:3000/admin/usuarios`](http://localhost:3000/admin/usuarios)), o podés ingresar desde el enlace **"Admin Usuarios"** en la barra superior.
3. En la tabla **"Usuarios pendientes de activación"** verás todas las cuentas registradas que se encuentran en estado **`INACTIVO`** (nombre de usuario, correo electrónico, nombre completo y estado).
4. Hacé clic en el botón verde **"Activar usuario"** correspondiente a la cuenta que deseás habilitar.
5. Se abrirá una ventana de **Confirmación**: presioná **"Sí, activar usuario"**.
6. El cambio se guardará en **MongoDB**, aparecerá un mensaje verde de confirmación y el usuario ya podrá iniciar sesión y comprar en **NOVA Shop**.

---

### 3.2. Administración del Catálogo, Precios y Stock (`RF-12`)

1. Hacé clic en **"Catálogo Admin"** en la barra superior ([`http://localhost:3000/admin`](http://localhost:3000/admin)).
2. En la sección **"Administración del Catálogo de Artículos"** podés:
   - **Aumentar stock rápidamente**: Usar el botón **`+5 Stock`** en cualquier fila de la tabla para reponer unidades de forma inmediata (`PATCH /api/v1/articulos/:codigo/stock`).
   - **Editar un producto existente**: Hacer clic en **"Cargar en formulario"** sobre cualquier artículo, modificar su nombre, descripción, precio unitario o stock, y presionar **"Guardar Artículo en Catálogo"**.
   - **Crear un nuevo artículo**: Ingresar un código nuevo (ej. `A-1010`), completar sus datos y guardarlo (`PUT /api/v1/articulos/:codigo`).
