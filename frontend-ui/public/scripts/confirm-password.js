/* Chris Sciavolino (cds253) */

document.addEventListener('DOMContentLoaded', function () {
    // select elements in the document to add event listeners
    const signUpForm = document.querySelector(".js-signup-form");
    const passwordField = document.querySelector(".js-password");
    const confirmPasswordField = document.querySelector(".js-confirm-pass");
    const confirmPasswordErrorMsg = document.querySelector(".js-confirm-pass-error");

    // show error msg for confirmed password if the two are not equivalent
    confirmPasswordField.addEventListener('keyup', function () {
        let shouldToggleError = false;
        if (confirmPasswordField.value !== passwordField.value) {
            if (!confirmPasswordErrorMsg.classList.contains("error-msg-active")) {
                // values not equal and error message not currently showing
                shouldToggleError = true;
            }
        } else {
            if (confirmPasswordErrorMsg.classList.contains("error-msg-active")) {
                // values equal and error message is currently showing
                shouldToggleError = true;
            }
        }

        if (shouldToggleError) {
            confirmPasswordErrorMsg.classList.toggle("error-msg-active");
        }
    });

    // prevent form from submitting if the confirmed password is not equal to normal password
    signUpForm.addEventListener('submit', function (event) {
        if (passwordField.value !== confirmPasswordField.value) {
            event.preventDefault();
            return false;
        }
    });
});