// Make sure that jQuery is available
function ensureJQuery() {
    if (typeof window.jQuery === 'undefined' && typeof window.$ !== 'undefined') {
        jQuery = $.noConflict();
    }
}

function isProbablyReaderable(tabId) {
    // The document needs to be completely loaded, to do this
    jQuery(function() {
        realIsProbablyReaderable(document.cloneNode(true), function() {
            // Great
            var message = { 
                tabId: tabId,
                buttonEnabled: true,
                alreadyFormatted: document.body.classList.contains('reader-view-enabled')
            };
            chrome.runtime.sendMessage(message);
        }, function () {
            realIsProbablyReaderable(document, function() {
                // OK-ish
                var message = { 
                    tabId: tabId,
                    buttonEnabled: true,
                    alreadyFormatted: document.body.classList.contains('reader-view-enabled')
                };
                chrome.runtime.sendMessage(message);
            }, function () {
                // Fail!
                var message = { 
                    tabId: tabId,
                    buttonEnabled: false,
                    alreadyFormatted: false
                };
                chrome.runtime.sendMessage(message);
            });
        });
    });
}

function realIsProbablyReaderable(doc, callbackOK, callbackFail) {
    // Create a reader for the current document
    var loc = document.location;
    var uri = {
        spec: loc.href,
        host: loc.host,
        prePath: loc.protocol + "//" + loc.host,
        scheme: loc.protocol.substr(0, loc.protocol.indexOf(":")),
        pathBase: loc.protocol + "//" + loc.host + loc.pathname.substr(0, loc.pathname.lastIndexOf("/") + 1)
    };
    var reader = new Readability(uri, doc);
    // Not all pages can be reformatted
    if (reader.isProbablyReaderable()) {
        callbackOK();
    } else {
        callbackFail();
    }
}

function openReaderView(fontFamily, fontSize, color) {
    realOpenReaderView(fontFamily, fontSize, color, document.cloneNode(true), function () {
        realOpenReaderView(fontFamily, fontSize, color, document, function () {
            chrome.runtime.sendMessage({ readerView: false, popup: 'popup-sorry.html' });
        });
    });
}

function realOpenReaderView(fontFamily, fontSize, color, doc, callbackFail) {
    ensureJQuery();
    // The document needs to be completely loaded, to do this
    jQuery(function() {
        // Create a reader for the current document
        var loc = document.location;
        var uri = {
            spec: loc.href,
            host: loc.host,
            prePath: loc.protocol + "//" + loc.host,
            scheme: loc.protocol.substr(0, loc.protocol.indexOf(":")),
            pathBase: loc.protocol + "//" + loc.host + loc.pathname.substr(0, loc.pathname.lastIndexOf("/") + 1)
        };
        var reader = new Readability(uri, doc);
        // Not all pages can be reformatted
        if (!reader.isProbablyReaderable()) {
            chrome.runtime.sendMessage({
                buttonEnabled: true,
                alreadyFormatted: false, 
                popup: 'html/popup-sorry.html'
            });
            return;
        }
        // Parse the article and create the new body's HTML
        var article = reader.parse();
        if (!article) {
            chrome.runtime.sendMessage({
                buttonEnabled: true,
                alreadyFormatted: false, 
                popup: 'html/popup-sorry.html'
            });
            return;
        }
        var html = '';
        if ('title' in article) {
            html += '<h1>' + article.title;
            if ('byline' in article) {
                html += '<br><span>' + article.byline + '</span>';
            }
            html += '</h1>'
        }
        if ('content' in article) {
            html += article.content;
        }
        // Add the sidebar and configure the style editing popup
        html += "<ul id=\"reader-toolbar\" class=\"toolbar\">";
        html += "    <style scoped=\"\">";
        html += "      @import url(\"" + chrome.extension.getURL('css/aboutReaderControls.css') + "\");";
        html += "    <\/style>";
        html += "    <li><button title=\"Close Reader View\" id=\"close-button\" class=\"button close-button\" onclick=\"window.location.reload()\"><\/button><\/li>";
        html += "    <ul id=\"style-dropdown\" class=\"dropdown\">";
        html += "      <li><button title=\"Controlli carattere\" class=\"dropdown-toggle button style-button\" onclick=\"toggleStyleDropdown()\"><\/button><\/li>";
        html += "      <li id=\"reader-popup\" class=\"dropdown-popup\">";
        html += "        <div id=\"font-type-buttons\"><button class=\"sans-serif-button\" onclick=\"setFontFamily('sans-serif')\"><div class=\"name\">Aa<\/div><div class=\"description\">Sans serif<\/div><\/button><button class=\"serif-button selected\" onclick=\"setFontFamily('serif')\"><div class=\"name\">Aa<\/div><div class=\"description\">Serif<\/div><\/button><\/div>";
        html += "        <hr>";
        html += "        <div id=\"font-size-buttons\">";
        html += "          <button id=\"font-size-minus\" class=\"minus-button\" onclick=\"setSmaller()\">";
        html += "          <\/button><button id=\"font-size-sample\">Aa<\/button><button id=\"font-size-plus\" class=\"plus-button\" onclick=\"setBigger()\">";
        html += "        <\/button><\/div>";
        html += "        <hr>";
        html += "        <div id=\"color-scheme-buttons\"><button class=\"light-button\" onclick=\"setColor('light')\"><div class=\"name\">Light<\/div><\/button><button class=\"dark-button\" onclick=\"setColor('dark')\"><div class=\"name\">Dark<\/div><\/button><button class=\"sepia-button selected\" onclick=\"setColor('sepia')\"><div class=\"name\">Sepia<\/div><\/button><\/div>";
        html += "        <div class=\"dropdown-arrow\">";
        html += "      <\/div><\/li>";
        html += "    <\/ul>";
        html += "<\/ul>";
        html += "<script>";
        html += "function toggleStyleDropdown() {";
        html += "    var dropdown = document.getElementById('style-dropdown');"
        html += "    dropdown.classList.toggle('open');";
        html += "    var dropdownToggle = dropdown.querySelector(\".dropdown-toggle\");";
        html += "    var dropdownPopup = dropdown.querySelector(\".dropdown-popup\");";
        html += "    var toggleHeight = dropdownToggle.offsetHeight;";
        html += "    var toggleTop = dropdownToggle.offsetTop;";
        html += "    var popupTop = toggleTop - toggleHeight \/ 2;";
        html += "    dropdownPopup.style.top = popupTop + \"px\";";
        html += "}";
        html += "function setFontFamily(family) {";
        html += "    if (family === 'serif') {"
        html += "        document.body.style.fontFamily = \"'Merriweather', Georgia, 'Times New Roman', Times, serif\";";
        html += "        document.getElementsByClassName('serif-button')[0].classList.add('selected');";
        html += "        document.getElementsByClassName('sans-serif-button')[0].classList.remove('selected');";
        html += "        window.dispatchEvent(new CustomEvent('prefs-font-family-serif'));"
        html += "    } else if (family === 'sans-serif') {";
        html += "        document.body.style.fontFamily =  \"'Open Sans', Helvetica, Arial, sans-serif\";";
        html += "        document.getElementsByClassName('serif-button')[0].classList.remove('selected');";
        html += "        document.getElementsByClassName('sans-serif-button')[0].classList.add('selected');";
        html += "        window.dispatchEvent(new CustomEvent('prefs-font-family-sans-serif'));"
        html += "    }";
        html += "}";
        html += "function setFontSize(size) {"
        html += "    document.body.style.fontSize = size + 'pt';";
        html += "    document.body.style.padding = (size * 4) + 'pt';";
        html += "    window.dispatchEvent(new CustomEvent('prefs-font-size-' + size));"
        html += "}"
        html += "function setBigger() {";
        html += "    if (fontSize >= 72) {";
        html += "        return;";
        html += "    }";
        html += "    fontSize += 2;";
        html += "    setFontSize(fontSize)";
        html += "}";
        html += "function setSmaller() {";
        html += "    if (fontSize <= 6) {";
        html += "        return;";
        html += "    }";
        html += "    fontSize -= 2;";
        html += "    setFontSize(fontSize)";
        html += "}";
        html += "function setColor(color) {";
        html += "   if (color === 'light') {"
        html += "       document.body.style.backgroundColor = 'white';";
        html += "       document.body.style.color = 'black';";
        html += "       document.getElementsByClassName('light-button')[0].classList.add('selected');";
        html += "       document.getElementsByClassName('dark-button')[0].classList.remove('selected');";
        html += "       document.getElementsByClassName('sepia-button')[0].classList.remove('selected');";
        html += "       window.dispatchEvent(new CustomEvent('prefs-color-light'));"
        html += "   } else if (color === 'dark') {"
        html += "       document.body.style.backgroundColor = 'black';";
        html += "       document.body.style.color = 'white';";
        html += "       document.getElementsByClassName('light-button')[0].classList.remove('selected');";
        html += "       document.getElementsByClassName('dark-button')[0].classList.add('selected');";
        html += "       document.getElementsByClassName('sepia-button')[0].classList.remove('selected');";
        html += "       window.dispatchEvent(new CustomEvent('prefs-color-dark'));"
        html += "   } else if (color === 'sepia') {"
        html += "       document.body.style.backgroundColor = '#FFFAFD';";
        html += "       document.body.style.color = 'black';";
        html += "       document.getElementsByClassName('light-button')[0].classList.remove('selected');";
        html += "       document.getElementsByClassName('dark-button')[0].classList.remove('selected');";
        html += "       document.getElementsByClassName('sepia-button')[0].classList.add('selected');";
        html += "       window.dispatchEvent(new CustomEvent('prefs-color-sepia'));"
        html += "   }"
        html += "}";
        html += "fontSize = " + fontSize + ";";
        html += "setFontSize(" + fontSize + ");";
        html += "setFontFamily('" + fontFamily + "');";
        html += "setColor('" + color + "');";
        html += "</script>";
        // Remove the page's CSS (what about inline styles?)
        jQuery('link[rel="stylesheet"]').remove();
        jQuery('style').remove();
        jQuery('*').removeAttr('style');
        // Add custom CSS
        var $resetCSS = jQuery('<link rel="stylesheet" type="text/css" href="' + chrome.extension.getURL('css/reset.css') +'">');
        var $readermodeCSS = $resetCSS = jQuery('<link rel="stylesheet" type="text/css" href="' + chrome.extension.getURL('css/readermode.css') +'">');
        var $head = jQuery('head');
        $head.append($resetCSS);
        $head.append($readermodeCSS);
        // Finally, replace the page body with the reformatted HTML
        var $body = jQuery('body');
        $body.html(html);
        jQuery('img').css('max-width', '100%').css('height', 'auto');
        $body.addClass('reader-view-enabled');
        // Add listeners for configuration changes
        jQuery.each(['serif', 'sans-serif'], function (k, v) {
            window.addEventListener("prefs-font-family-" + v, function (evt) {
                chrome.storage.sync.set({ fontFamily: v });
            }, false);
        });
        for (var i = 6; i <= 72; i += 2) (function (v) {
            window.addEventListener("prefs-font-size-" + v, function (evt) {
                chrome.storage.sync.set({ fontSize: v });
            }, false);
        })(i);
        jQuery.each(['light', 'dark', 'sepia'], function (k, v) {
            window.addEventListener("prefs-color-" + v, function (evt) {
                chrome.storage.sync.set({ color: v });
            }, false);
        });
        // Finally, tell the background script that everything's done
        chrome.runtime.sendMessage({ 
            buttonEnabled: true, 
            alreadyFormatted: true 
        });
    });
}

