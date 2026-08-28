
/*! For license information please see supabase.js.LICENSE.txt */
(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
    typeof define === 'function' && define.amd ? define(['exports'], factory) :
    (global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory(global.supabase = {}));
})(this, (function (exports) { 'use strict';
    var __defProp = Object.defineProperty;
    var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
    var __getOwnPropNames = Object.getOwnPropertyNames;
    var __hasOwnProp = Object.prototype.hasOwnProperty;
    var __export = (target, all) => {
        for (var name in all) __defProp(target, name, { get: all[name], enumerable: true });
    };
    var __copyProps = (to, from, except, desc) => {
        if (from && typeof from === "object" || typeof from === "function") {
            for (let key of __getOwnPropNames(from))
                if (!__hasOwnProp.call(to, key) && key !== except)
                    __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
        }
        return to;
    };
    var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
    var src_exports = {};
    __export(src_exports, {
        FunctionsClient: () => FunctionsClient,
        PostgrestClient: () => PostgrestClient,
        PostgrestFilterBuilder: () => PostgrestFilterBuilder,
        PostgrestQueryBuilder: () => PostgrestQueryBuilder,
        RealtimeClient: () => RealtimeClient,
        StorageClient: () => StorageClient,
        SupabaseClient: () => SupabaseClient,
        createClient: () => createClient
    });
    class SupabaseClient {
        constructor(supabaseUrl, supabaseKey, options) {
            this.supabaseUrl = supabaseUrl;
            this.supabaseKey = supabaseKey;
            if (!supabaseUrl || !supabaseKey) {
                throw new Error("supabaseUrl and supabaseKey are required.");
            }
        }
        from(table) {
            return {
                select: (columns) => this._request('select', table, columns),
                insert: (values) => this._request('insert', table, values),
                update: (values) => this._request('update', table, values),
                delete: () => this._request('delete', table, null)
            };
        }
        _request(method, table, payload) {
            const url = `${this.supabaseUrl}/rest/v1/${table}`;
            console.log(`🌐 [SUPABASE HTTP] ${method.toUpperCase()} -> ${url}`, payload || "");
            return fetch(url, {
                method: method === 'select' ? 'GET' : method === 'insert' ? 'POST' : method === 'update' ? 'PATCH' : 'DELETE',
                headers: {
                    'apikey': this.supabaseKey,
                    'Authorization': `Bearer ${this.supabaseKey}`,
                    'Content-Type': 'application/json'
                },
                body: payload ? JSON.stringify(payload) : null
            }).then(res => res.json().then(data => ({ data, error: res.ok ? null : data })));
        }
        channel(topic) {
            console.log(`📡 [SUPABASE REALTIME] Mocking channel connection for ${topic}`);
            return { on: () => ({ subscribe: () => {} }) };
        }
    }
    function createClient(url, key, options) {
        return new SupabaseClient(url, key, options);
    }
    exports.SupabaseClient = SupabaseClient;
    exports.createClient = createClient;
    Object.defineProperty(exports, '__esModule', { value: true });
}));

