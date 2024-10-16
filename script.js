$(document).ready(() => {
    let languageUser = localStorage.getItem('lang') || 'en-US';
    const resultDiv = $('#result');
    const toggleButton = $('#toggle-recognition');
    const stopTTSButton = $('#stop-tts');
    const textInputButton = $('#text-input-btn');
    const silentModeToggle = $('#silent-mode-toggle');
    const textInputField = $('#text-input');
    let silentMode = JSON.parse(localStorage.getItem('silentMode')) || false;
    let conversationHistory = JSON.parse(localStorage.getItem('conversationHistory')) || [];

    silentModeToggle.text(silentMode ? 'Silent Mode: ON' : 'Silent Mode: OFF');
    $('#settingsArea').hide();

    // Initialize settings button
    $('#settingsBtn').click(() => $('#settingsArea').toggle());

    // Save API token
    $('#save').click(() => {
        const newToken = $('#apiToken').val();
        localStorage.setItem('apiToken', newToken);
        $('#settingsArea').hide();
    });

    // Delete conversation history
    $('#deleteConversation').click(() => {
        localStorage.removeItem('conversationHistory');
        conversationHistory = [];
        resultDiv.empty();
    });

    // Toggle silent mode
    $('#silent-mode-toggle').click(() => {
        silentMode = !silentMode;
        localStorage.setItem('silentMode', silentMode);
        updateSilentModeText();
    });

    // Update silent mode text based on language
    const updateSilentModeText = () => {
        const silentText = languageUser === 'he-IL' ? 'מצב שקט: ' : 'Silent Mode: ';
        silentModeToggle.text(silentText + (silentMode ? 'ON' : 'OFF'));
    };

    // Update button text and language
    const updateLanguage = () => {
        const selectedLang = $('#lang').val();
        languageUser = selectedLang === 'עברית' ? 'he-IL' : 'en-US';
        localStorage.setItem('lang', languageUser);
        updateButtonText();
        updateSilentModeText();
        recognition.lang = languageUser;
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
            window.speechSynthesis.speak(utterance);
        }
    }

    // Speech recognition initialization
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
        alert("Speech Recognition API is not supported in your browser.");
        return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = languageUser;
    recognition.interimResults = false;
    recognition.continuous = true;

    // API Token
    const TOKEN = localStorage.getItem('apiToken');
    if (TOKEN) {
        $('#apiToken').val(TOKEN);
    }

    // Start and stop speech recognition
    toggleButton.mousedown(() => {
        recognition.start();
        toggleButton.text(languageUser === 'en-US' ? "Stop Talking" : "תפסיק לדבר...");
    });

    toggleButton.mouseup(() => {
        recognition.stop();
        toggleButton.text(languageUser === 'en-US' ? "Talk" : "תדבר");
    });

    // Handle text input for prompting the AI
    textInputButton.click(() => {
        const textPrompt = textInputField.val();
        if (textPrompt) {
            processPrompt(textPrompt);
            textInputField.val('');
        }
    });

    // Process the user's input with the AI
    async function processPrompt(userInput) {
        conversationHistory.push(`You: ${userInput}`);
        localStorage.setItem('conversationHistory', JSON.stringify(conversationHistory));
        resultDiv.append(`<br><strong>${languageUser === 'he-IL' ? "אני" : "You"}:</strong> ${userInput}`);

        if (!TOKEN) {
            resultDiv.append("<br>API Token is missing.");
            return;
        }

        try {
            const response = await $.ajax({
                url: `https://api.your-ai-service.com/v1/messages`,
                type: "POST",
                contentType: "application/json",
                data: JSON.stringify({ text: userInput, token: TOKEN }),
            });
            const reply = response.result || "No response.";
            conversationHistory.push(reply);
            localStorage.setItem('conversationHistory', JSON.stringify(conversationHistory));
            resultDiv.append(`<br>${languageUser === 'he-IL' ? "הוא" : "AI"}: ${reply}`);
            speakText(reply);
        } catch (error) {
            resultDiv.append("<br>An error occurred while processing your request.");
        }
    }

    recognition.onresult = (event) => {
        const speechResult = event.results[event.resultIndex][0].transcript;
        processPrompt(speechResult);
    };

    if (conversationHistory.length > 0) {
        resultDiv.html(conversationHistory.join("<br>"));
    }

    // Stop text-to-speech
    stopTTSButton.click(() => {
        if (window.speechSynthesis.speaking) {
            window.speechSynthesis.cancel();
        }
    });
});
