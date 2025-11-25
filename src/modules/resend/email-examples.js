// Example: How to send emails using the API route

// 1. Send a benefit admin email
fetch('/api/resend', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    template: 'benefit-admin',
    to: 'admin@yourcompany.com',
    data: {
      name: 'John Doe',
      email: 'john@example.com',
      // Add other data as needed
    }
  })
});

// 2. Send a benefit user email
fetch('/api/resend', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    template: 'benefit-user',
    to: 'user@example.com',
    data: {
      name: 'John Doe',
    }
  })
});

// 3. Send a contact admin email
fetch('/api/resend', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    template: 'kontakt-admin',
    to: 'admin@yourcompany.com',
    data: {
      name: 'Jane Smith',
      email: 'jane@example.com',
      message: 'Hello, I have a question...'
    }
  })
});
