document.getElementById('uploadForm').addEventListener('submit', async (event) => {
    event.preventDefault();

    const formData = new FormData();
    const xCer = document.getElementById('X_CER').files[0];
    const xiiCer = document.getElementById('XII_CER').files[0];
    const ugCer = document.getElementById('UG_CER').files[0];

    if (xCer) formData.append('X_CER', xCer);
    if (xiiCer) formData.append('XII_CER', xiiCer);
    if (ugCer) formData.append('UG_CER', ugCer);

    try {
        const response = await fetch('/user_dashboard', {
            method: 'POST',
            body: formData
        });

        const result = await response.json();
        if (response.ok) {
            document.getElementById("X_CER").value = '';
            document.getElementById("XII_CER").value = '';
            document.getElementById("UG_CER").value = '';
            alert('Files uploaded and stored successfully');
        } else {
            alert('Error: ' + result.error);
        }
    } catch (error) {
        console.error('Error:', error);
        alert('An error occurred while uploading the files');
    }
});


document.getElementById('logoutButton').addEventListener('click', async () => {
    try {
        const response = await fetch('/logout', {
            method: 'POST'
        });
        const data = await response.json();

        if (response.ok) {
            window.location.href = data.redirectTo;
        } else {
            console.error('Failed to logout:', data);
        }
    } catch (error) {
        console.error('Error during logout:', error);
    }
});