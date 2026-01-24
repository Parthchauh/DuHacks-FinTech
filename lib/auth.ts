export interface RegisteredUser {
    email: string;
    name: string;
    password: string; // Stored in plain text for this local-only demo (mock auth)
}

const STORAGE_KEY = "optiwealth_users";

export function registerUser(user: RegisteredUser): { success: boolean; message: string } {
    const usersStr = localStorage.getItem(STORAGE_KEY);
    const users: RegisteredUser[] = usersStr ? JSON.parse(usersStr) : [];

    if (users.find((u) => u.email === user.email)) {
        return { success: false, message: "User already exists with this email." };
    }

    users.push(user);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(users));
    return { success: true, message: "Account created successfully." };
}

export function loginUser(email: string, password: string): { success: boolean; user?: RegisteredUser; message: string } {
    const usersStr = localStorage.getItem(STORAGE_KEY);
    const users: RegisteredUser[] = usersStr ? JSON.parse(usersStr) : [];

    const user = users.find((u) => u.email === email && u.password === password);

    if (!user) {
        return { success: false, message: "Invalid credentials." };
    }

    return { success: true, user, message: "Login successful." };
}
