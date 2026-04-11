import fs from 'fs';
import { execSync } from 'child_process';

const replacements = [
  ["'购买成功！'", "'shop.purchaseSuccess'"],
  ["'购买失败，请检查余额或库存'", "'shop.purchaseError'"],
  ["'商品已删除'", "'shop.productDeleted'"],
  ["'删除商品失败'", "'shop.deleteProductError'"],
  ["'分类创建成功'", "'shop.categoryCreated'"],
  ["'创建分类失败'", "'shop.createCategoryError'"],
  ["'删除分类失败'", "'shop.deleteCategoryError'"],
  ["'更新分类失败'", "'shop.updateCategoryError'"],
  ["'加入购物车失败'", "'shop.addToCartError'"],
  ["'下单成功！'", "'shop.orderSuccess'"],
  ["'下单失败'", "'shop.orderError'"],
  ["'评价已提交，感谢您的反馈！'", "'shop.reviewSubmitted'"],
  ["'评价失败'", "'shop.reviewError'"],
  ["'订单已取消'", "'shop.orderCancelled'"],
  ["'订单状态不允许取消'", "'shop.cancelNotAllowed'"],
  ["'店铺设置已保存'", "'shop.settingsSaved'"],
  ["'保存失败'", "'shop.saveError'"],
  ["'上传失败'", "'shop.uploadError'"],
  ["'分享已发起'", "'shop.shareStarted'"],
  ["'分享链接已复制'", "'shop.shareLinkCopied'"],
  ["'暂时无法分享'", "'shop.shareUnavailable'"],
  ["'联系客服失败'", "'shop.contactSupportError'"],
  ["'已自动拉入 Buddy 并就绪'", "'shop.buddyReady'"],
  ["'已自动拉入 Buddy，正在等待'", "'shop.buddyWaiting'"],
  ["'已联系店主和客服'", "'shop.contactSellerDone'"],
  ["'已加入收藏'", "'shop.favoriteAdded'"],
  ["'已取消收藏'", "'shop.favoriteRemoved'"],
  ["'加入购物车失败(500)'", "'shop.addToCartError(500)'"],
  ["'删除商品失败(500)'", "'shop.deleteProductError(500)'"],
  ["'删除分类失败(500)'", "'shop.deleteCategoryError(500)'"],
  ["'保存失败(500)'", "'shop.saveError(500)'"],
  ["'下单失败(500)'", "'shop.orderError(500)'"],
  ["'评价失败(500)'", "'shop.reviewError(500)'"],
  ["'上传失败(500)'", "'shop.uploadError(500)'"],
  ["'订单状态已更新'", "'shop.orderStatusUpdated'"],
  ["'更新订单状态失败'", "'shop.updateOrderStatusError'"],
  ["'保存店铺设置失败'", "'shop.saveSettingsError'"],
  ["'上传失败！'", "'shop.uploadError!'"],
];

const output = execSync('find apps/web/__tests__ -name "*.tsx" -o -name "*.ts"').toString();
const files = output.trim().split('\n').filter(f => f.length > 0);

let fixedCount = 0;
for (const f of files) {
  let content = fs.readFileSync(f, 'utf8');
  let original = content;
  for (const [old, newVal] of replacements) {
    content = content.split(old).join(newVal);
  }
  if (content !== original) {
    fs.writeFileSync(f, content);
    fixedCount++;
    console.log(`Fixed: ${f}`);
  }
}
console.log(`\nTotal files fixed: ${fixedCount}`);
