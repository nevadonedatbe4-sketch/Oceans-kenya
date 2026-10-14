// ─────────────────────────────────────────────────────────────
// Defensive DOM shims for the well-known React crash caused by in-page DOM
// mutation from Google Translate and some browser extensions.
//
// Those tools replace/move text nodes that React still tracks (Translate wraps
// text in <font> tags). React's reconciler later calls removeChild / insertBefore
// on a node that is no longer where it expects, throwing
//   NotFoundError: Failed to execute 'removeChild' on 'Node': The node to be
//   removed is not a child of this node
// which unmounts the entire app. Making these two operations fail soft when the
// node isn't actually a child prevents the crash, while leaving normal rendering
// — and page translation — fully working. This is a widely-used workaround for a
// long-standing React + Google Translate incompatibility.
// ─────────────────────────────────────────────────────────────

export function installDomSafetyShims(): void {
  if (typeof Node === 'undefined' || !Node.prototype) return;
  const flag = '__oceansDomSafetyInstalled';
  const w = window as unknown as Record<string, boolean>;
  if (w[flag]) return;
  w[flag] = true;

  const originalRemoveChild = Node.prototype.removeChild;
  Node.prototype.removeChild = function <T extends Node>(this: Node, child: T): T {
    // Only remove when the node is genuinely our child; otherwise an extension
    // already moved/removed it — returning it (instead of throwing) lets React
    // continue instead of crashing the whole tree.
    if (child.parentNode !== this) return child;
    return originalRemoveChild.call(this, child) as T;
  } as typeof Node.prototype.removeChild;

  const originalInsertBefore = Node.prototype.insertBefore;
  Node.prototype.insertBefore = function <T extends Node>(this: Node, newNode: T, referenceNode: Node | null): T {
    // If the reference sibling was moved out by an extension, append to this
    // parent instead of throwing, so the new node still lands in the right place.
    if (referenceNode && referenceNode.parentNode !== this) {
      return originalInsertBefore.call(this, newNode, null) as T;
    }
    return originalInsertBefore.call(this, newNode, referenceNode) as T;
  } as typeof Node.prototype.insertBefore;
}
