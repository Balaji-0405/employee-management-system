import { RoleProvider } from "./components/role-context";
import AppRoutes from "./routes/AppRoutes";

function App() {
  return (
    <RoleProvider>
      <AppRoutes />
    </RoleProvider>
  );
}

export default App;
