import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import axiosInstance from "../lib/axios";
import { useNavigate } from "react-router-dom";
import { User } from "@/data/type";

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
  isAuthorized: (requiredRole: string) => boolean;
  isLoading: boolean;
}

// Tạo context mặc định
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// AuthProvider để bọc các component con
export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  // Lấy thông tin người dùng từ localStorage khi ứng dụng khởi chạy
  useEffect(() => {
    const savedUser = localStorage.getItem("user");
    const token = localStorage.getItem("accessToken");

    if (savedUser && token) {
      setUser(JSON.parse(savedUser));
      setIsAuthenticated(true);
    }
    setIsLoading(false);
  }, []);

  // Hàm đăng nhập
  const login = async (email: string, password: string) => {
    try {
      // Gửi request đến API login
      const response = await axiosInstance.post("/login/", {
        email,
        password,
      });

      // Lấy token từ response
      const accessToken = response.data.access;
      const refreshToken = response.data.refresh;

      // Lưu token vào localStorage
      localStorage.setItem("accessToken", accessToken);
      localStorage.setItem("refreshToken", refreshToken);

      // (Tùy chọn) Gọi API lấy thông tin người dùng
      const userResponse = await axiosInstance.get("/me/", {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      const loggedInUser = userResponse.data;

      // Lưu thông tin người dùng vào state và localStorage
      localStorage.setItem("user", JSON.stringify(loggedInUser));
      setUser(loggedInUser);
      setIsAuthenticated(true);
    } catch (error) {
      console.error("Login failed:", error);
      throw new Error("Invalid email or password");
    }
  };

  // Hàm đăng xuất
  const logout = () => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("user");
    localStorage.removeItem("refreshToken");
    // Xóa thông tin người dùng trong state
    setUser(null);
    setIsAuthenticated(false);
    // xóa token khỏi axiosInstance
    delete axiosInstance.defaults.headers.common["Authorization"];
    // Điều hướng về trang đăng nhập
    navigate("/login");
  };

  // Kiểm tra quyền của người dùng
  const isAuthorized = (requiredRole: string): boolean => {
    return user?.role === requiredRole;
  };

  return (
    <AuthContext.Provider
      value={{ user, login, logout, isAuthenticated, isAuthorized, isLoading }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// Hook để sử dụng AuthContext
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
