import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const source = readFileSync(new URL('../js/auth.js', import.meta.url), 'utf8')
    .replace(/^import .*;\r?\n/gm, '').replace('export { initAuth };', '');

function setup(account = null, failure = false) {
    const elements = new Map();
    const element = id => {
        if (!elements.has(id)) elements.set(id, { hidden: false, disabled: true, textContent: '', addEventListener() {} });
        return elements.get(id);
    };
    let loginRequest;
    const context = vm.createContext({
        CONFIG: { tenantId: 'nsia', clientId: 'app', redirectUri: 'https://example.org/redirect.html', logoutUri: 'https://example.org/index.html' },
        PublicClientApplication: class {
            async initialize() { if (failure) throw new Error('network'); }
            async handleRedirectPromise() { return null; }
            getAllAccounts() { return account ? [account] : []; }
            getActiveAccount() { return account; }
            setActiveAccount() {}
            async loginRedirect(request) { loginRequest = request; throw new Error('cancelled'); }
        },
        document: { getElementById: element }, window: {}, console: { error() {}, info() {} }
    });
    vm.runInContext(source, context);
    return { context, element, request: () => loginRequest };
}

test('une session absente garde la plateforme masquée et autorise la connexion', async () => {
    const { context, element } = setup();
    await vm.runInContext('initAuth()', context);
    assert.equal(element('appShell').hidden, true);
    assert.equal(element('loginScreen').hidden, false);
    assert.equal(element('loginScreenButton').disabled, false);
});
test('une session du bon annuaire ouvre la plateforme', async () => {
    const { context, element } = setup({ tenantId: 'nsia', name: 'Test User', username: 'test@example.org' });
    await vm.runInContext('initAuth()', context);
    assert.equal(element('appShell').hidden, false);
    assert.equal(element('loginScreen').hidden, true);
    assert.equal(element('userName').textContent, 'Test User');
});
test('une session provenant dun autre annuaire reste refusée', async () => {
    const { context, element } = setup({ tenantId: 'other' });
    await vm.runInContext('initAuth()', context);
    assert.equal(element('appShell').hidden, true);
});
test('une erreur initiale garde la connexion fermée et affiche une explication', async () => {
    const { context, element } = setup(null, true);
    await vm.runInContext('initAuth()', context);
    assert.equal(element('appShell').hidden, true);
    assert.equal(element('loginScreenButton').disabled, true);
    assert.match(element('loginStatus').textContent, /Impossible/);
});
test('une connexion annulée peut être relancée et demande seulement le profil', async () => {
    const { context, element, request } = setup();
    await vm.runInContext('initAuth();', context);
    await vm.runInContext('loginMicrosoft()', context);
    assert.deepEqual(Array.from(request().scopes), ['User.Read']);
    assert.equal(element('loginScreenButton').disabled, false);
    assert.match(element('loginStatus').textContent, /réessayer/);
});
