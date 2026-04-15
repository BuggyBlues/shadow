/**
 * Remark plugin: transforms ```mermaid code blocks into <MermaidDiagram> JSX elements.
 *
 * Input in MDX:
 *   ```mermaid
 *   flowchart LR
 *     A --> B
 *   ```
 *
 * Output (MDX JSX AST):
 *   <MermaidDiagram diagram="flowchart LR\n  A --> B" />
 */

interface MdastNode {
  type: string
  children?: MdastNode[]
  value?: string
  lang?: string
  meta?: string
  name?: string
  attributes?: unknown[]
  data?: unknown
}

export default function remarkMermaid() {
  return (tree: MdastNode) => {
    const children = tree.children!
    let i = 0

    while (i < children.length) {
      const node = children[i]

      if (node.type === 'code' && node.lang === 'mermaid') {
        const diagram = (node.value ?? '').trim()

        const jsxNode: MdastNode = {
          type: 'mdxJsxFlowElement',
          name: 'MermaidDiagram',
          attributes: [
            {
              type: 'mdxJsxAttribute',
              name: 'diagram',
              value: {
                type: 'mdxJsxAttributeValueExpression',
                value: JSON.stringify(diagram),
                data: {
                  estree: {
                    type: 'Program',
                    sourceType: 'module',
                    body: [
                      {
                        type: 'ExpressionStatement',
                        expression: {
                          type: 'Literal',
                          value: diagram,
                          raw: JSON.stringify(diagram),
                        },
                      },
                    ],
                  },
                },
              },
            },
          ],
          children: [],
        }

        children.splice(i, 1, jsxNode)
      }

      i++
    }
  }
}
