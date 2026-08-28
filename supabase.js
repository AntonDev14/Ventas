(function (global, factory) {
    global.supabase = factory();
})(this, (function () { 'use strict';
    class SupabaseClient {
        constructor(supabaseUrl, supabaseKey) {
            this.supabaseUrl = supabaseUrl;
            this.supabaseKey = supabaseKey;
        }
        from(table) {
            return {
                select: (columns) => {
                    const req = this._request('GET', table, columns);
                    return {
                        order: (col, opts) => req // Soporte para la funcion .order()
                    };
                },
                insert: (values) => this._request('POST', table, values),
                update: (values) => this._request('PATCH', table, values),
                delete: () => this._request('DELETE', table, null)
            };
        }
        _request(method, table, payload) {
            // Limpiar URL por si tiene diagonales o rutas repetidas
            let baseUrl = this.supabaseUrl.replace(/\/rest\/v1\/?$/, "");
            baseUrl = baseUrl.replace(/\/$/, "");
            
            const url = `${baseUrl}/rest/v1/${table}`;
            console.log(`🌐 [SUPABASE HTTP] ${method} -> ${url}`);
            
            const options = {
                method: method,
                headers: {
                    'apikey': this.supabaseKey,
                    'Authorization': `Bearer ${this.supabaseKey}`,
                    'Content-Type': 'application/json'
                }
            };
            
            // Solo añadir body si NO es una consulta GET
            if (method !== 'GET' && payload) {
                options.body = JSON.stringify(payload);
            }
            
            return fetch(url, options).then(res => {
                if (res.status === 204) return { data: [], error: null }; // Respuestas vacias de borrado/update
                return res.json().then(data => ({ data, error: res.ok ? null : data }));
            });
        }
        channel(topic) {
            console.log(`📡 [SUPABASE REALTIME] Canal simulado activo para: ${topic}`);
            return { on: () => ({ subscribe: () => {} }) };
        }
    }
    return {
        createClient: (url, key) => new SupabaseClient(url, key)
    };
}));
