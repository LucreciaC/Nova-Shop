'use client';

import { createContext, useContext, useEffect, useState } from 'react';

const GATEWAY_URL =
  process.env.NEXT_PUBLIC_API_GATEWAY_URL || 'http://localhost:8080';

export function generateUUID() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

const StoreContext = createContext(null);

export function StoreProvider({ children }) {
  const [token, setToken] = useState('');
  const [usuario, setUsuario] = useState(null);

  const [articulos, setArticulos] = useState([]);
  const [carrito, setCarrito] = useState([]);
  const [favoritos, setFavoritos] = useState([]);
  const [pedidos, setPedidos] = useState([]);

  // Estado UI
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [confirmedOrderModal, setConfirmedOrderModal] = useState(null);
  const [toast, setToast] = useState(null);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Todas');

  // Telemetría SOA (X-Trace-ID, Idempotency-Key, Load Balancer, Circuit Breaker)
  const [lastTraceId, setLastTraceId] = useState('-');
  const [lastVentasInstance, setLastVentasInstance] = useState('-');
  const [lastCircuitState, setLastCircuitState] = useState('CLOSED');
  const [currentIdempotencyKey, setCurrentIdempotencyKey] = useState('');
  const [lastUsedIdempotencyKey, setLastUsedIdempotencyKey] = useState('');
  const [lastUsedCartLines, setLastUsedCartLines] = useState([]);
  const [gatewayStatus, setGatewayStatus] = useState(null);

  // Hidratar sesión y carrito desde localStorage
  useEffect(() => {
    setCurrentIdempotencyKey(generateUUID());
    try {
      const savedToken = localStorage.getItem('nexo_token');
      const savedUser = localStorage.getItem('nexo_user');
      const savedCart = localStorage.getItem('nexo_cart');
      const savedFavs = localStorage.getItem('nexo_favs');

      if (savedToken && savedUser) {
        setToken(savedToken);
        setUsuario(JSON.parse(savedUser));
      }
      if (savedCart) {
        setCarrito(JSON.parse(savedCart));
      }
      if (savedFavs) {
        setFavoritos(JSON.parse(savedFavs));
      }
    } catch (_) {}

    cargarCatalogo();
    cargarEstadoGateway();
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('nexo_cart', JSON.stringify(carrito));
    } catch (_) {}
  }, [carrito]);

  useEffect(() => {
    try {
      localStorage.setItem('nexo_favs', JSON.stringify(favoritos));
    } catch (_) {}
  }, [favoritos]);

  function showToast(text, type = 'info') {
    setToast({ text, type });
    setTimeout(() => {
      setToast((prev) => (prev?.text === text ? null : prev));
    }, 5500);
  }

  /**
   * Cliente HTTP centralizado hacia el API Gateway (/api/v1/*)
   * Propaga X-Trace-ID en cada operación (TP3-1 pág. 58)
   */
  async function apiRequest(path, options = {}, customToken = null) {
    const traceId = generateUUID();
    const activeToken = customToken !== null ? customToken : token;

    const headers = {
      'Content-Type': 'application/json',
      'X-Trace-ID': traceId,
      ...(options.headers || {}),
    };

    if (activeToken) {
      headers['Authorization'] = `Bearer ${activeToken}`;
    }

    const res = await fetch(`${GATEWAY_URL}${path}`, {
      ...options,
      headers,
    });

    const returnedTrace = res.headers.get('x-trace-id') || traceId;
    const ventasInst = res.headers.get('x-ventas-instance');
    const circuitSt = res.headers.get('x-circuit-state');

    setLastTraceId(returnedTrace);
    if (ventasInst) setLastVentasInstance(ventasInst);
    if (circuitSt) setLastCircuitState(circuitSt);

    const data = await res.json().catch(() => ({}));
    return { res, data, traceId: returnedTrace };
  }

  async function cargarCatalogo() {
    try {
      const { res, data } = await apiRequest('/api/v1/articulos');
      if (res.ok && Array.isArray(data)) {
        setArticulos(data);
      }
    } catch (_) {}
  }

  async function cargarEstadoGateway() {
    try {
      const { res, data } = await apiRequest('/api/v1/gateway/status');
      if (res.ok) setGatewayStatus(data);
    } catch (_) {}
  }

  async function cargarPedidos(overrideToken = null) {
    try {
      const { res, data } = await apiRequest(
        '/api/v1/pedidos',
        {},
        overrideToken,
      );
      if (res.ok && Array.isArray(data)) {
        setPedidos(data);
      }
    } catch (_) {}
  }

  function guardarSesion(accessToken, userObj) {
    setToken(accessToken);
    setUsuario(userObj);
    try {
      localStorage.setItem('nexo_token', accessToken);
      localStorage.setItem('nexo_user', JSON.stringify(userObj));
    } catch (_) {}
  }

  function cerrarSesion() {
    setToken('');
    setUsuario(null);
    setPedidos([]);
    try {
      localStorage.removeItem('nexo_token');
      localStorage.removeItem('nexo_user');
    } catch (_) {}
    showToast('Sesión cerrada correctamente.', 'info');
  }

  function toggleFavorito(codigo) {
    setFavoritos((prev) =>
      prev.includes(codigo)
        ? prev.filter((c) => c !== codigo)
        : [...prev, codigo],
    );
  }

  function agregarAlCarrito(articulo, cantidad = 1, abrirDrawer = true) {
    setCarrito((prev) => {
      const existente = prev.find((i) => i.codigoArticulo === articulo.codigo);
      if (existente) {
        return prev.map((i) =>
          i.codigoArticulo === articulo.codigo
            ? { ...i, cantidad: i.cantidad + Number(cantidad) }
            : i,
        );
      }
      return [
        ...prev,
        {
          codigoArticulo: articulo.codigo,
          nombre: articulo.nombre,
          descripcion: articulo.descripcion,
          precioUnitario: Number(articulo.precioUnitario),
          cantidad: Number(cantidad),
        },
      ];
    });
    if (abrirDrawer) {
      setIsCartOpen(true);
    } else {
      showToast(`Agregado al carrito: ${articulo.nombre}`, 'success');
    }
  }

  function actualizarCantidadCarrito(codigo, nuevaCantidad) {
    if (nuevaCantidad <= 0) {
      eliminarDelCarrito(codigo);
      return;
    }
    setCarrito((prev) =>
      prev.map((i) =>
        i.codigoArticulo === codigo
          ? { ...i, cantidad: Number(nuevaCantidad) }
          : i,
      ),
    );
  }

  function eliminarDelCarrito(codigo) {
    setCarrito((prev) => prev.filter((i) => i.codigoArticulo !== codigo));
  }

  async function finalizarCompra(esReintentoIdempotente = false, onNeedLogin) {
    if (!token || !usuario) {
      setIsCartOpen(false);
      showToast('Iniciá sesión para confirmar tu pedido.', 'warning');
      if (onNeedLogin) onNeedLogin();
      return;
    }

    const lineasAEnviar = esReintentoIdempotente
      ? lastUsedCartLines
      : carrito.map((c) => ({
          codigoArticulo: c.codigoArticulo,
          cantidad: Number(c.cantidad),
        }));

    const keyToUse = esReintentoIdempotente
      ? lastUsedIdempotencyKey
      : currentIdempotencyKey;

    if (!lineasAEnviar || lineasAEnviar.length === 0) {
      showToast('Tu carrito está vacío.', 'warning');
      return;
    }

    setLoading(true);
    try {
      const { res, data } = await apiRequest('/api/v1/pedidos', {
        method: 'POST',
        headers: {
          'Idempotency-Key': keyToUse,
        },
        body: JSON.stringify({ lineas: lineasAEnviar }),
      });

      const isReplay = res.headers.get('x-idempotent-replay') === 'true';

      if (!res.ok) {
        showToast(
          `[HTTP ${res.status}] ${data.message || data.error}`,
          'error',
        );
      } else {
        setLastUsedIdempotencyKey(keyToUse);
        setLastUsedCartLines(lineasAEnviar);

        if (!esReintentoIdempotente) {
          setCarrito([]);
          setCurrentIdempotencyKey(generateUUID());
        }

        setIsCartOpen(false);
        await cargarCatalogo();
        await cargarPedidos();

        // Mostrar el modal "¡Pedido confirmado!" tal como en el mockup
        setConfirmedOrderModal({
          ...data,
          idempotencyKey: keyToUse,
          isReplay,
        });
      }
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  }

  const cantidadTotalCarrito = carrito.reduce(
    (acc, item) => acc + item.cantidad,
    0,
  );
  const subtotalCarrito = carrito.reduce(
    (acc, item) => acc + item.precioUnitario * item.cantidad,
    0,
  );

  return (
    <StoreContext.Provider
      value={{
        GATEWAY_URL,
        token,
        usuario,
        articulos,
        carrito,
        favoritos,
        pedidos,
        isCartOpen,
        setIsCartOpen,
        confirmedOrderModal,
        setConfirmedOrderModal,
        toast,
        setToast,
        showToast,
        loading,
        setLoading,
        searchQuery,
        setSearchQuery,
        selectedCategory,
        setSelectedCategory,
        lastTraceId,
        lastVentasInstance,
        lastCircuitState,
        currentIdempotencyKey,
        lastUsedIdempotencyKey,
        gatewayStatus,
        apiRequest,
        cargarCatalogo,
        cargarEstadoGateway,
        cargarPedidos,
        guardarSesion,
        cerrarSesion,
        toggleFavorito,
        agregarAlCarrito,
        actualizarCantidadCarrito,
        eliminarDelCarrito,
        finalizarCompra,
        cantidadTotalCarrito,
        subtotalCarrito,
      }}
    >
      {children}
    </StoreContext.Provider>
  );
}

export function useStore() {
  return useContext(StoreContext);
}
