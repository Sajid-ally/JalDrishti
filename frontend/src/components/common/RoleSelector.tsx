import { FiUser, FiShield } from "react-icons/fi";
import type { UserRole } from "../../context/AuthContext";

interface RoleSelectorProps {
  selectedRole: UserRole;
  onSelectRole: (role: UserRole) => void;
}

export default function RoleSelector({
  selectedRole,
  onSelectRole,
}: RoleSelectorProps) {
  return (
    <div className="role-selector">
      <button
        type="button"
        id="role-citizen"
        className={`role-card ${selectedRole === "citizen" ? "role-card-active" : ""}`}
        onClick={() => onSelectRole("citizen")}
        aria-pressed={selectedRole === "citizen"}
      >
        <span className="role-card-icon">
          <FiUser size={20} />
        </span>
        <span className="role-card-label">Citizen</span>
        <span className="role-card-desc">Report hazards &amp; stay informed</span>
      </button>

      <button
        type="button"
        id="role-government"
        className={`role-card ${selectedRole === "government" ? "role-card-active" : ""}`}
        onClick={() => onSelectRole("government")}
        aria-pressed={selectedRole === "government"}
      >
        <span className="role-card-icon">
          <FiShield size={20} />
        </span>
        <span className="role-card-label">Government Official</span>
        <span className="role-card-desc">Verify reports &amp; coordinate response</span>
      </button>
    </div>
  );
}
