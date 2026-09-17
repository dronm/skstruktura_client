import type { RouteRecordRaw } from "vue-router";

import type { ApplicationRouteManifestItem } from "@katren/vue-business-app/application-routes";

import Main from "@/views/Main.vue";
import { generatedRouteManifest } from "@/router/routeManifest.gen";

const MainMenuConstructor = () =>
	import("@katren/vue-business-app/menu").then(
		(module) => module.MainMenuConstructorView,
	);
const ApplicationRouteList = () =>
	import("@katren/vue-business-app/application-routes").then(
		(module) => module.ApplicationRoutesView,
	);
const UserList = () => import("@/views/user/UserList.vue");
const UserEditPage = () => import("@/views/user/UserEditPage.vue");
const UserProfile = () => import("@/views/user/UserProfile.vue");
const MaterialActionReportPage = () =>
	import("@/views/reports/MaterialActionReportPage.vue");
const DiadocDocumentList = () =>
	import("@/views/diadoc/DiadocDocumentList.vue");
const DiadocDocumentEditPage = () =>
	import("@/views/diadoc/DiadocDocumentEditPage.vue");

interface RouteManifestEntry {
	route: RouteRecordRaw;
	registry: ApplicationRouteManifestItem;
}

const defineRoute = (
	route: RouteRecordRaw,
	registry: Omit<ApplicationRouteManifestItem, "name" | "path">,
): RouteManifestEntry => {
	return {
		route,
		registry: {
			name: String(route.name ?? ""),
			path: route.path,
			...registry,
		},
	};
};

const manualRouteManifest: RouteManifestEntry[] = [
	defineRoute(
		{
			path: "/",
			name: "main",
			component: Main,
		},
		{
			descr: "Главная",
			section: "Формы",
			icon: null,
			menu_available: false,
		},
	),
	defineRoute(
		{
			path: "/reports/material-actions",
			name: "materialActionReport",
			component: MaterialActionReportPage,
		},
		{
			descr: "Движение материалов",
			section: "Отчёты",
			icon: "pi pi-chart-bar",
			menu_available: true,
		},
	),
	defineRoute(
		{
			path: "/diadoc/documents",
			name: "diadocDocuments",
			component: DiadocDocumentList,
		},
		{
			descr: "Импорт документов Диадока",
			section: "Документы",
			icon: "pi pi-cloud-download",
			menu_available: true,
		},
	),
	defineRoute(
		{
			path: "/diadoc/documents/:id",
			name: "diadocDocumentEdit",
			component: DiadocDocumentEditPage,
			props: true,
		},
		{
			descr: "Импорт документа Диадока",
			section: "Формы",
			icon: null,
			menu_available: false,
		},
	),
	defineRoute(
		{
			path: "/profile",
			name: "userProfile",
			component: UserProfile,
		},
		{
			descr: "Мой профиль",
			section: "Формы",
			icon: "pi pi-user",
			menu_available: false,
		},
	),
	defineRoute(
		{
			path: "/users",
			name: "users",
			component: UserList,
			meta: {
				roleId: "admin",
			},
		},
		{
			descr: "Пользователи",
			section: "Администрирование",
			icon: "pi pi-users",
			menu_available: true,
		},
	),
	defineRoute(
		{
			path: "/users/new",
			name: "userCreate",
			component: UserEditPage,
			meta: {
				roleId: "admin",
			},
		},
		{
			descr: "Создание пользователя",
			section: "Формы",
			icon: null,
			menu_available: false,
		},
	),
	defineRoute(
		{
			path: "/users/:id",
			name: "userEdit",
			component: UserEditPage,
			props: true,
			meta: {
				roleId: "admin",
			},
		},
		{
			descr: "Изменение пользователя",
			section: "Формы",
			icon: null,
			menu_available: false,
		},
	),
	defineRoute(
		{
			path: "/main-menu-constructor",
			name: "mainMenuConstructor",
			component: MainMenuConstructor,
			meta: {
				roleId: "admin",
			},
		},
		{
			descr: "Конструктор главного меню",
			section: "Администрирование",
			icon: "pi pi-sitemap",
			menu_available: false,
		},
	),
	defineRoute(
		{
			path: "/application-routes",
			name: "applicationRoutes",
			component: ApplicationRouteList,
			meta: {
				roleId: "admin",
			},
		},
		{
			descr: "Все формы",
			section: "Формы",
			icon: "pi pi-th-large",
			menu_available: true,
		},
	),
];

export const routeManifest: RouteManifestEntry[] = [
	...manualRouteManifest,
	...generatedRouteManifest,
];

export const applicationRouteManifest: ApplicationRouteManifestItem[] =
	routeManifest.map((item) => ({
		...item.registry,
	}));

export const applicationRouteRecords: RouteRecordRaw[] = routeManifest.map(
	(item) => item.route,
);
