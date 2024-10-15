$(document).ready(() => {
    let languageUser = 'he-IL'; // Default language
    const resultDiv = $('#result');
    const toggleButton = $('#toggle-recognition');
    const stopTTSButton = $('#stop-tts'); // New Stop Talking button
    let silenceTimeout; // Timeout variable for detecting silence

    // Load conversation history from local storage
    let conversationHistory = JSON.parse(localStorage.getItem('conversationHistory')) || [];


    $('#deleteConversation').click(()=>{
        localStorage.clear()
    })
    // Function to update the languageUser based on the selected option
    const updateLanguage = () => {
        const selectedLang = $('#lang').val();
        languageUser = selectedLang === 'עברית' ? 'he-IL' : 'en-US';
        recognition.lang = languageUser; // Update recognition language
    };

    $('#lang').change(updateLanguage); // Update language on change

    function speakText(text) {
        if ('speechSynthesis' in window) {
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = languageUser; // Set the language for speech synthesis

            // Event listeners to manage the stop functionality
            utterance.onend = () => {
                stopTTSButton.prop('disabled', true); // Disable the stop button after speaking
            };

            window.speechSynthesis.speak(utterance);
            stopTTSButton.prop('disabled', false); // Enable the stop button
        }
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
        alert("Speech Recognition API is not supported in your browser.");
        return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = languageUser; // Set the language for speech recognition
    recognition.interimResults = false;
    recognition.continuous = true; // Keep listening continuously

    const TOKEN = 'AIzaSyB4Hka0BMKYNd5tiMCJo5G3qB13oDO40d8';

    toggleButton.mousedown(() => {
        resultDiv.text("מקשיב לך...");
        recognition.start();
        toggleButton.text("תפסיק לדבר");
    });

    toggleButton.mouseup(() => {
        recognition.stop();
        toggleButton.text("התחל לדבר");
    });

    recognition.onresult = async (event) => {
        const speechResult = event.results[event.resultIndex][0].transcript;

        // Only process the result if the volume is above the threshold
        const confidence = event.results[event.resultIndex][0].confidence; // This value usually ranges between 0 and 1
        if (confidence < 0.3) { // Assuming a 0.5 threshold, adjust if needed
            return; // Ignore low-confidence results
        }

        resultDiv.append(`<br>אני: ${speechResult}`); // Append user input to resultDiv

        // Append the user's input to conversation history
        conversationHistory.push(`אני: ${speechResult}`);

        // Reset the timeout for silence detection
        clearTimeout(silenceTimeout);

        // Set a longer timeout duration (e.g., 1 minute)
        silenceTimeout = setTimeout(() => {
            recognition.stop();
            toggleButton.text("התחל לדבר");
            resultDiv.append("<br>Listening stopped due to inactivity.");
        }, 60000); // Stop listening after 60 seconds (1 minute) of silence

        const apiEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${TOKEN}`;

        // Combine previous conversation with the new speech input
        const combinedHistory = conversationHistory.join('\n');

        const requestData = {
            contents: [
                {
                    parts: [
                        { text: combinedHistory } // Send the entire conversation history
                    ]
                }
            ]
        };

        try {
            const response = await $.ajax({
                url: apiEndpoint,
                type: "POST",
                contentType: "application/json",
                data: JSON.stringify(requestData)
            });
            // Clean the generated content by removing asterisks
            const generatedContent = response.candidates[0].content.parts[0].text.replace(/\*\*/g, '').trim();
            resultDiv.append(`<br>הוא: ${generatedContent}`);

            // Append the AI's response to conversation history
            conversationHistory.push(`הוא: ${generatedContent}`);
            localStorage.setItem('conversationHistory', JSON.stringify(conversationHistory)); // Store in local storage

            // Speak the generated content
            speakText(generatedContent);
        } catch (error) {
            console.error("Error communicating with Gemini AI Studio:", error);
            resultDiv.append("<br>An error occurred while fetching the response.");
        }
    };

    recognition.onerror = (event) => {
        if (event.error !== "no-speech") {
            resultDiv.text("Error occurred: " + event.error);
        }
    };

    recognition.onend = () => {
        // Optionally, handle any end of recognition logic here
        // but it won't be used in this version
    };
    
    // Load conversation history on page load
    if (conversationHistory.length > 0) {
        resultDiv.html(conversationHistory.join("<br>")); // Display the conversation history in resultDiv
    }

    // Stop TTS button functionality
    stopTTSButton.on('click', () => {
        if (window.speechSynthesis.speaking) {
            window.speechSynthesis.cancel(); // Stop any ongoing speech
            stopTTSButton.prop('disabled', true); // Disable the stop button
        }
    });
});
