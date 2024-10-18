// Fetch user files data and populate the table
async function fetchUserFiles() {
    try {
        const response = await fetch('/api/user-files');
        if (!response.ok) {
            throw new Error('Failed to fetch user files data');
        }
        const data = await response.json();
        populateUserFilesTable(data);
    } catch (error) {
        console.error('Error fetching user files data:', error);
    }
}

// Populate the user files table with data
function populateUserFilesTable(data) {
    const tableBody = document.getElementById('userFilesTableBody');
    tableBody.innerHTML = ''; // Clear existing rows

    data.forEach(row => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${row.email}</td>
            <td>${row.f_name}</td>
            <td>${row.l_name}</td>
            <td>${row.address}</td>
            <td>${row.x_cer_name || 'N/A'}</td>
            <td>${row.xii_cer_name || 'N/A'}</td>
            <td>${row.ug_cer_name || 'N/A'}</td>
        `;
        tableBody.appendChild(tr);
    });
}

// Call the fetchUserFiles function when the page loads
window.addEventListener('DOMContentLoaded', fetchUserFiles);

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

document.getElementById('reminder-button').addEventListener('click', () => {
    fetch('http://localhost:3000/send-reminder', {
        method: 'POST'
    })
    .then(response => response.text())
    .then(data => {
        console.log('Success:', data);
        alert('Emails sent successfully!');
    })
    .catch(error => {
        console.error('Error:', error);
        alert('Error sending emails. Please try again later.');
    });
});
