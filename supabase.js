(function (global, factory) {
    global.supabase = factory();
})(this, (function () { 'use strict';
    // CREDENCIALES FIJADAS EN EL MOTOR DE RED INTERNO PARA EVITAR ERRORES CORS
    const FIXED_URL = "https://rhgskluslkthtvjhfrxy.supabase.co";
    const FIXED_KEY = "sb_publishable_W2ZrcHc2HCWbO0vAWZ3AeQ_gfstDZGB";

    class SupabaseClient {
        constructor() {
            this.supabaseUrl = FIXED_URL;
            this.supabaseKey = FIXED_KEY;
            
            // Módulo de Autenticación con URL Blindada Privada
            this.auth = {
                signInWithPassword: async ({ email, password }) => {
                    const url = `${this.supabaseUrl}/auth/v1/token?grant_type=password`;
                    console.log(`🔒 [SUPABASE AUTH CLOUD] Solicitando token a tu proyecto K&A -> ${url}`);
                    try {
                        const res = await fetch(url, {
                            method: 'POST',
                            headers: {
                                'apikey': this.supabaseKey,
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({ email, password })
                        });
                        const data = await res.json();
                        if (!res.ok) return { data: null, error: data };
                        
                        return { data: { user: data.user, session: data }, error: null };
                    } catch (err) {
                        return { data: null, error: err };
                    }
                }
            };
        }
        from(table) {
            return {
                select: (columns) => {
                    const req = this._request('GET', table, columns);
                    return { order: (col, opts) => req };
                },
                insert: (values) => this._request('POST', table, values),
                update: (values) => {
                    return { eq: (colName, colVal) => this._request('PATCH', `${table}?${colName}=eq.${colVal}`, values) };
                },
                delete: () => {
                    return { eq: (colName, colVal) => this._request('DELETE', `${table}?${colName}=eq.${colVal}`, null) };
                }
            };
        }
        _request(method, table, payload) {
            const url = `${this.supabaseUrl}/rest/v1/${table}`;
            console.log(`🌐 [SUPABASE HTTP CLOUD] ${method} -> ${url}`);
            
            const options = {
                method: method,
                headers: {
                    'apikey': this.supabaseKey,
                    'Authorization': `Bearer ${this.supabaseKey}`,
                    'Content-Type': 'application/json',
                    'Prefer': 'return=representation'
                }
            };
            
            if (method !== 'GET' && payload) {
                options.body = JSON.stringify(payload);
            }
            
            return fetch(url, options).then(res => {
                if (res.status === 204) return { data: [], error: null };
                return res.text().then(text => {
                    const data = text ? JSON.parse(text) : [];
                    return { data: res.ok ? data : null, error: res.ok ? null : data };
                });
            }).catch(err => {
                console.error("Fallo de red en Fetch:", err);
                return { data: null, error: err };
            });
        }
    }
    return { createClient: () => new SupabaseClient() };
}));
