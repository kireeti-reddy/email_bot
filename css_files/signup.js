document.getElementById('signupForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    // Retrieve form field values
    const firstName = document.getElementById('F_NAME').value;
    const lastName = document.getElementById('L_NAME').value;
    const address = document.getElementById('ADDRESS').value;
    const username = document.getElementById('signupEmail').value;
    const password = document.getElementById('signupPassword').value;
    const retypePassword = document.getElementById('RetypePassword').value;
    const adminKey = document.getElementById('ADMIN_KEY').value;

    // Check if passwords match
    if (password !== retypePassword) {
        alert("Passwords do not match!");
        return;
    }

    // If passwords match, proceed with sending data to backend
    const res = await fetch('/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ firstName, lastName, address, username, password, adminKey })
    });

    // Handle response from backend
    const data = await res.json();
    if (data.error) {
        alert(data.error);
    } else if (data.redirectTo) {
        window.location.href = data.redirectTo;
    } else {
        console.log(data);
    }
});
