document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;

    const res = await fetch('/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
    });
    const data = await res.json();
    if (data.error) {
        alert(data.error);
    }else if (data.redirectTo) {
        window.location.href = data.redirectTo;
    } else {
        console.log(data);
    }
});


document.getElementById('protected-button').addEventListener('click', async () => {
    const res = await fetch('/protected');
    const data = await res.json();
    console.log(data);
});
