import { useState } from "react";
import api from "../../config/api";

export default function Signup() {
  const [form, setForm] = useState({
    vendor_id: "",
    name: "",
    email: "",
    password: "",
    role: "vendor_admin",
  });

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    await api.post("/auth/signup", form);
    alert("User created. Please login.");
  };

  return (
    <form onSubmit={handleSubmit}>
      <input name="vendor_id" onChange={handleChange} placeholder="Vendor ID" />
      <input name="name" onChange={handleChange} placeholder="Name" />
      <input name="email" onChange={handleChange} placeholder="Email" />
      <input
        name="password"
        type="password"
        onChange={handleChange}
        placeholder="Password"
      />
      <button type="submit">Signup</button>
    </form>
  );
}
