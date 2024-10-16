
$(document).ready(() => {
    let languageUser = localStorage.getItem('lang') || 'en-US';
    const resultDiv = $('#result');
    const toggleButton = $('#toggle-recognition');
    const stopTTSButton = $('#stop-tts');
    const textInputButton = $('#text-input-btn');
    const silentModeToggle = $('#silent-mode-toggle');
    const textInputField = $('#text-input');
    let silenceTimeout;

    let silentMode = JSON.parse(localStorage.getItem('silentMode')) || false;
    let conversationHistory = JSON.parse(localStorage.getItem('conversationHistory')) || [];

    silentModeToggle.text(silentMode ? 'Silent Mode: ON' : 'Silent Mode: OFF');
    $('#settingsArea').hide();
    $('#settingsBtn').click(() => $('#settingsArea').show());

    $('#save').click(() => {
        const newToken = $('#apiToken').val();
        localStorage.setItem('apiToken', JSON.stringify(newToken));
        $('#settingsArea').hide();
    });

    $('#deleteConversation').click(() => {
        localStorage.removeItem('conversationHistory');
        conversationHistory = [];
        resultDiv.empty();
    });

    $('#silent-mode-toggle').click(() => {
        silentMode = !silentMode;
        localStorage.setItem('silentMode', silentMode);
        updateSilentModeText();
    });

    const updateSilentModeText = () => {
        const silentText = languageUser === 'he-IL' ? 'מצב שקט: ' : 'Silent Mode: ';
        silentModeToggle.text(silentText + (silentMode ? 'ON' : 'OFF'));
    };

    const updateLanguage = () => {
        const selectedLang = $('#lang').val();
        languageUser = selectedLang === 'עברית' ? 'he-IL' : 'en-US';
        localStorage.setItem('lang', selectedLang);
        updateButtonText();
        updateSilentModeText();
        recognition.lang = languageUser;

        if (recognition.running) {
            recognition.stop();
            recognition.start();
        }
    };

    const updateButtonText = () => {
        if (languageUser === 'he-IL') {
            $('#deleteConversation').text('מחק שיחה');
            $('#stop-tts').text('עצור');
            $('#save').text('שמור');
            $('#settingsBtn').text('הגדרות');
            toggleButton.text('דבר');
            textInputButton.text('שלח שאלה');
        } else {
            $('#deleteConversation').text('Delete chat');
            $('#stop-tts').text('Stop');
            $('#save').text('Save');
            $('#settingsBtn').text('Settings');
            toggleButton.text('Talk');
            textInputButton.text('Send Prompt');
        }
    };

    $('#lang').change(updateLanguage);
    updateButtonText();
    updateSilentModeText();

    function speakText(text) {
        if ('speechSynthesis' in window && !silentMode) {
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = languageUser;
            utterance.onend = () => stopTTSButton.prop('disabled', true);
            window.speechSynthesis.speak(utterance);
            stopTTSButton.prop('disabled', false);
        }
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
        alert("Speech Recognition API is not supported in your browser.");
        return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = languageUser;
    recognition.interimResults = false;
    recognition.continuous = true;

    const savedToken = JSON.parse(localStorage.getItem('apiToken'));
    if (savedToken) {
        $('#apiToken').val(savedToken);
    }
    const TOKEN = savedToken;

    toggleButton.mousedown(() => {
        resultDiv.text(languageUser === 'en-US' ? "Listening..." : "מקשיב..");
        recognition.start();
        toggleButton.text(languageUser === 'en-US' ? "Stop Talking" : "תפסיק לדבר...");
    });

    toggleButton.mouseup(() => {
        recognition.stop();
        toggleButton.text(languageUser === 'en-US' ? "Talk" : "תדבר");
    });

    textInputButton.click(() => {
        const textPrompt = textInputField.val();
        if (textPrompt) {
            processPrompt(textPrompt);
            textInputField.val(''); // Clear input field after sending prompt
        }
    });

    async function processPrompt(userInput) {
        resultDiv.append(`<br><strong>אני:</strong> ${userInput}`);
        conversationHistory.push(`אני: ${userInput}`);
        localStorage.setItem('conversationHistory', JSON.stringify(conversationHistory));

        if (!TOKEN) {
            console.error("API Token is not available.");
            resultDiv.append("<br>API Token is missing.");
            return;
        }

        const apiEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${TOKEN}`;
        const requestData = { contents: [{ parts: [{ text: conversationHistory.join('\n') }] }] };

        try {
            const response = await $.ajax({
                url: apiEndpoint,
                type: "POST",
                contentType: "application/json",
                data: JSON.stringify(requestData)
            });
            const generatedContent = response.candidates[0].content.parts[0].text.replace(/\*\*/g, '').trim();
            resultDiv.append(`<br>הוא: ${generatedContent}`);
            conversationHistory.push(`הוא: ${generatedContent}`);
            localStorage.setItem('conversationHistory', JSON.stringify(conversationHistory));
            speakText(generatedContent);
        } catch (error) {
            console.error("Error communicating with Gemini AI Studio:", error);
            resultDiv.append("<br>An error occurred while fetching the response.");
        }
    }

    recognition.onresult = (event) => {
        const speechResult = event.results[event.resultIndex][0].transcript;
        if (event.results[event.resultIndex][0].confidence < 0.2) return;
        processPrompt(speechResult);
    };

    recognition.onerror = (event) => {
        if (event.error !== "no-speech") {
            resultDiv.text("Error occurred: " + event.error);
        }
    };

    if (conversationHistory.length > 0) {
        resultDiv.html(conversationHistory.join("<br>"));
    }

    stopTTSButton.on('click', () => {
        if (window.speechSynthesis.speaking) {
            window.speechSynthesis.cancel();
            stopTTSButton.prop('disabled', true);
        }
    });
});