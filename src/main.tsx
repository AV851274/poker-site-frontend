import { createRoot } from "react-dom/client";
import {
  createBrowserRouter,
  Navigate,
  RouterProvider,
} from "react-router-dom";
import Table from './table';
import CreateTable from './createTable';
import AuthPage from "./authPage";
import "./index.css";

const router = createBrowserRouter([
  {
    path: "/v1",
    element: <AuthPage />,
    children: [
      {
        path: "create",
        element: <CreateTable />,
      },
      {
        path: "table/:tid",
        element: <Table />,
      },
    ]
  },
  {
    path: "/",
    element: <Navigate to="/v1/create" />,
  },
]);

//@ts-ignore
createRoot(document.getElementById("root")).render(
  <RouterProvider router={router} />
);
