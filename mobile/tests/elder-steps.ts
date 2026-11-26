import { expect, type Locator, type Page } from "@playwright/test";

export async function advanceTo(page: Page, target: Locator) {
  const next = page.getByRole("button", {name:"Próximo",exact:true}).last();
  await expect(target.or(next).first()).toBeVisible();
  for (let index=0; index<12 && !(await target.isVisible()); index++) {
    if (!(await next.isVisible()) || !(await next.isEnabled())) break;
    await next.click();
  }
  await expect(target).toBeVisible();
  return target;
}
