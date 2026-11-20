import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

function start() {
    const elements = Object.fromEntries(['pageContent', 'toast', 'sidebar', 'mobileMenu'].map(id => [id, {
        innerHTML: '', addEventListener() {}, classList: { remove() {}, toggle() {} }
    }]));
    const intervals = [];
    const context = vm.createContext({
        CONFIG: { copilot: { chatUrl: 'https://example.org' } },
        window: {}, Intl, Date, console,
        document: { visibilityState: 'visible', getElementById: id => elements[id] || null, querySelectorAll: () => [] },
        setInterval: callback => { intervals.push(callback); return intervals.length; },
        clearInterval() {}
    });
    const source = readFileSync(new URL('../js/app.js', import.meta.url), 'utf8').replace(/^import .*;\r?\n/gm, '');
    vm.runInContext(source, context);
    return { context, elements, intervals };
}

test('la page accueil démarre avant MSAL sans variable documentaire hors portée', () => {
    const { context, elements } = start();
    assert.equal(context.window.currentPage, 'Accueil');
    assert.ok(elements.pageContent.innerHTML.length > 0);
    assert.doesNotThrow(() => vm.runInContext('wirePage("Analyse documentaire")', context));
});

test('lactualisation ne lit pas SharePoint avant une session Microsoft', async () => {
    const { context, intervals } = start();
    for (const callback of intervals) callback();
    await context.window.loadArticlesFromSharePoint(true);
    let calls = 0;
    context.window.fetchSharePointArticles = async () => { calls++; return []; };
    context.window.getCurrentUser = () => null;
    await context.window.loadArticlesFromSharePoint(true);
    assert.equal(calls, 0);
    context.window.getCurrentUser = () => ({ tenantId: 'nsia' });
    await context.window.loadArticlesFromSharePoint(true);
    assert.equal(calls, 1);
});
