Read AGENTS.md first and follow it strictly.

Implement the Sign Up screen exactly as shown in the attached design. Then create a matching Sign In screen using the same layout and visual style, but with sign-in copy.

**Sign In:** email + password + social (Google/Apple), with a "Forgot password?" link.

**Sign Up:** email + password + confirm password + social (Google/Apple).

Both screens share the same shell, spacing, and visual treatment. Do not remove the password field from sign-in.

Update onboarding so pressing Get Started navigates to the Sign Up screen.

When the main Sign Up or Sign In button is pressed, show a verification modal saying the user has received an email and should enter the verification code.

The code should be 6 digits, use the number pad, keep the modal above the keyboard, and automatically navigate to the home route (/) when the last digit is entered.

@prompt_material/auth/auth-log-in-screen.png

@prompt_material/auth/auth-sign-up-screen.png

@assets/images/auth/mascot-log-in.png

@assets/images/auth/mascot-sign-up.png
