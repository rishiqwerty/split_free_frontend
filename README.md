# Split Free Frontend

**Split Free** is a web application designed to simplify expense sharing among groups. Whether you're splitting bills with roommates, planning a trip with friends, or managing shared expenses, Split Free helps you track and settle balances effortlessly.

🌐 Live Demo: [split-free-frontend.vercel.app](https://split-free-frontend.vercel.app)  

⚠️ Note:  
The initial load of the app might take around 60–70 seconds since the backend server is hosted on Render’s free tier, which can cause it to spin down when idle.  

---

## Screenshot (UI):  
![image](https://github.com/rishiqwerty/split_free_frontend/blob/rishiqwerty-patch-1/Screenshot%202025-04-21%20at%202.06.27%E2%80%AFAM.png)

---

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
- [Usage](#usage)
- [Project Structure](#project-structure)
- [Contributing](#contributing)
- [License](#license)

---

## Features

- **Group Management**: Create and manage groups for different expense-sharing scenarios.
- **Expense Tracking**: Add, edit, and delete expenses with ease.
- **Real-time Calculations**: Automatically calculates who owes whom and how much.
- **Responsive Design**: Optimized for both desktop and mobile devices.
- **Smart Overview**: Smart overviews, spending summaries, and detailed expense breakdowns powered by AI
- **Smart Group/Expense Icons**: Auto icon assignment for expenses and groups for quick visual cues.
- **User-Friendly Interface**: Intuitive UI for seamless navigation and interaction.

---

## Tech Stack

- **Frontend**: [React](https://reactjs.org/) with [TypeScript](https://www.typescriptlang.org/)
- **Bundler**: [Vite](https://vitejs.dev/) for fast and efficient development
- **Deployment**: [Vercel](https://vercel.com/) for continuous deployment

---

## Getting Started

Follow these steps to set up the project locally:

### Prerequisites

- [Node.js](https://nodejs.org/) (v14 or higher)
- [npm](https://www.npmjs.com/) or [yarn](https://yarnpkg.com/)

### Installation

1. **Clone the repository:**

   ```bash
   git clone https://github.com/rishiqwerty/split_free_frontend.git
   cd split_free_frontend
   ```

2. **Install dependencies:**

   Using npm:

   ```bash
   npm install
   ```

   Or using yarn:

   ```bash
   yarn install
   ```

3. **Start the development server:**

   Using npm:

   ```bash
   npm run dev
   ```

   Or using yarn:

   ```bash
   yarn dev
   ```

4. **Open your browser:**

   Navigate to [http://localhost:5173](http://localhost:5173) to view the application.

---

## Environmental settings
Create .env file at root location, fill the firebase details for auth
```
   VITE_FIREBASE_API_KEY=iuvsfsivus-cvvsiadkawodsadk
   VITE_FIREBASE_AUTH_DOMAIN=splitfree-sdvsd.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=splitfree-dsvcds
   VITE_FIREBASE_STORAGE_BUCKET=splitfree-cvdsvdd.dasv.com
   VITE_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
   VITE_FIREBASE_APP_ID=your_app_id
   VITE_FIREBASE_MEASUREMENT_ID=G-sdfdfd
   # VITE_API_URL=https://splitfree-backend.onrender.com/admin/
   VITE_API_URL=http://127.0.0.1:8000
```

## Usage

1. **Create a Group**: Click on "Create Group" and enter the group name and members' details.
2. **Add Expenses**: Within the group, add expenses by specifying the amount, payer, and participants.
3. **View Balances**: The app calculates and displays who owes whom and how much.
4. **Settle Up**: Record payments to settle debts within the group.

---

## Project Structure

```
split_free_frontend/
├── public/             # Static assets
├── src/                # Source code
│   ├── components/     # Reusable components
│   ├── pages/          # Page components
│   ├── context/        # Context API providers
│   ├── hooks/          # Custom React hooks
│   ├── utils/          # Utility functions
│   └── App.tsx         # Root component
├── index.html          # HTML template
├── package.json        # Project metadata and scripts
├── tailwind.config.js  # Tailwind CSS configuration
└── vite.config.ts      # Vite configuration
```

---

## Contributing

Contributions are welcome! Here's how you can help:

1. **Fork the repository**
2. **Create a new branch**:

   ```bash
   git checkout -b feature/your-feature-name
   ```

3. **Make your changes**
4. **Commit your changes**:

   ```bash
   git commit -m "Add your message here"
   ```

5. **Push to your fork**:

   ```bash
   git push origin feature/your-feature-name
   ```

6. **Create a Pull Request**: Submit your PR for review.

Please ensure your code adheres to the existing code style and includes relevant tests.

---

---

