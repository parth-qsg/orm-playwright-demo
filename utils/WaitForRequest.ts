import { Page } from "@playwright/test";

class WaitForRequest {
  async waitForDashboardToLoad(
    page: Page,
    actionCallback: () => Promise<void>
  ) {
    const responsePromise = page.waitForResponse(
      "/web/index.php/dashboard/index"
    );
    await actionCallback();
    return await responsePromise;
  }
}
export default new WaitForRequest();
