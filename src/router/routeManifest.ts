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
const MaterialBalancePage = () =>
	import("@/views/reports/MaterialBalancePage.vue");
const ConstructionManagerWorkspace = () =>
	import("@/views/constructionManager/ConstructionManagerWorkspace.vue");
const SupplyManagerWorkspace = () =>
	import("@/views/supplyManager/SupplyManagerWorkspace.vue");
const MaterialDocumentPrintPage = () =>
	import("@/views/documents/MaterialDocumentPrintPage.vue");
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
			path: "/construction-manager",
			name: "constructionManagerWorkspace",
			component: ConstructionManagerWorkspace,
			meta: {
				roleId: "construction_site_manager",
			},
		},
		{
			descr: "Рабочее место прораба",
			section: "Формы",
			icon: "pi pi-briefcase",
			menu_available: false,
		},
	),
	defineRoute(
		{
			path: "/supply-manager",
			name: "supplyManagerWorkspace",
			component: SupplyManagerWorkspace,
			meta: {
				roleId: "supply_manager",
			},
		},
		{
			descr: "Рабочее место снабженца",
			section: "Формы",
			icon: "pi pi-briefcase",
			menu_available: false,
		},
	),
	defineRoute(
		{
			path: "/material-transfers/:id/print",
			name: "materialTransferPrint",
			component: MaterialDocumentPrintPage,
			props: (route) => ({
				kind: "transfer",
				documentId: Number(route.params.id),
			}),
			meta: {
				printLayout: true,
			},
		},
		{
			descr: "Печатная форма перемещения материалов",
			section: "Формы",
			icon: null,
			menu_available: false,
		},
	),
	defineRoute(
		{
			path: "/material-consumptions/:id/print",
			name: "materialConsumptionPrint",
			component: MaterialDocumentPrintPage,
			props: (route) => ({
				kind: "consumption",
				documentId: Number(route.params.id),
			}),
			meta: {
				printLayout: true,
			},
		},
		{
			descr: "Печатная форма списания материалов",
			section: "Формы",
			icon: null,
			menu_available: false,
		},
	),
	defineRoute(
		{
			path: "/material-requests/:id/print",
			name: "materialRequestPrint",
			component: MaterialDocumentPrintPage,
			props: (route) => ({
				kind: "request",
				documentId: Number(route.params.id),
			}),
			meta: {
				printLayout: true,
			},
		},
		{
			descr: "Печатная форма заявки на материалы",
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
			path: "/material-balance",
			name: "materialBalance",
			component: MaterialBalancePage,
		},
		{
			descr: "Остатки материалов",
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
