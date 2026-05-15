/**
 * translate.js — Silent auto-translation based on browser language.
 * Uses Google Translate Element with autoDisplay:false so no toolbar
 * is injected into the page layout.
 * Skips translation if the browser language is already English.
 */
(function () {
    'use strict';

    var userLang = (navigator.language || navigator.userLanguage || 'en')
        .split('-')[0].toLowerCase();

    // Nothing to do for English browsers
    if (userLang === 'en') return;

    function getCookie(name) {
        var m = document.cookie.match(new RegExp('(?:^|;\\s*)' + name + '=([^;]*)'));
        return m ? decodeURIComponent(m[1]) : '';
    }

    function setCookie(name, value) {
        // Set on both the hostname and bare path (covers localhost)
        var host = location.hostname;
        document.cookie = name + '=' + value + '; path=/; domain=' + host;
        document.cookie = name + '=' + value + '; path=/';
    }

    // Only update cookie if not already set to the correct target language
    var current = getCookie('googtrans');
    if (!current || current === '/en/en' || current.indexOf('/en/' + userLang) === -1) {
        setCookie('googtrans', '/en/' + userLang);
    }

    // Initialisation callback required by Google Translate
    window.googleTranslateElementInit = function () {
        var host = document.getElementById('google_translate_host');
        if (!host) {
            host = document.createElement('div');
            host.id = 'google_translate_host';
            host.style.cssText = 'position:absolute;left:-9999px;top:-9999px;visibility:hidden;';
            document.body.appendChild(host);
        }
        /* global google */
        new google.translate.TranslateElement({
            pageLanguage: 'en',
            autoDisplay: false,
            multilanguagePage: false
        }, 'google_translate_host');
    };

    // Dynamically load the Google Translate script
    var s = document.createElement('script');
    s.src = 'https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';
    s.async = true;
    s.onerror = function () {
        // Silently ignore — translation is enhancement only
    };
    document.head.appendChild(s);
}());
