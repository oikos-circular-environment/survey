import {
	SidebarInset,
	SidebarProvider,
	SidebarTrigger,
} from "@survey/ui/components/sidebar";
import { DateRangeProvider } from "@/components/dashboard/date-range-context";
import { DashboardSidebar } from "@/components/dashboard/sidebar-nav";

export default function DashboardLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<DateRangeProvider>
			<SidebarProvider className="min-w-0">
				<DashboardSidebar />
				<SidebarInset className="min-w-0">
					<div className="flex min-w-0 flex-1 flex-col gap-6 p-6 md:p-8">
						<SidebarTrigger className="md:hidden" />
						{children}
					</div>
				</SidebarInset>
			</SidebarProvider>
		</DateRangeProvider>
	);
}
