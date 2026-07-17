const repositoryUrl = "https://github.com/code-salad/abstract-flow";
const packageName = "abstract-flow";
const skillInstall = `git clone --depth 1 --branch beta https://github.com/code-salad/abstract-flow.git /tmp/abstract-flow
cp -R /tmp/abstract-flow/skills/abstract-flow <agent-skill-root>/abstract-flow
rm -rf /tmp/abstract-flow`;
const skillUninstall = "rm -rf <agent-skill-root>/abstract-flow";

function HeroDiagram() {
  return (
    <figure className="hero-diagram">
      <svg
        aria-describedby="hero-flow-description"
        aria-labelledby="hero-flow-title"
        role="img"
        viewBox="0 0 660 430"
      >
        <title id="hero-flow-title">
          Source code mapped to a control-flow graph
        </title>
        <desc id="hero-flow-description">
          A TypeScript function is analyzed into a graph with a branch and a
          labeled error exit.
        </desc>
        <defs>
          <marker
            id="hero-arrow"
            markerHeight="7"
            markerWidth="7"
            orient="auto-start-reverse"
            refX="6"
            refY="3.5"
            viewBox="0 0 7 7"
          >
            <path d="M0,0 L7,3.5 L0,7 Z" fill="currentColor" />
          </marker>
          <linearGradient id="hero-code-fade" x1="0" x2="0" y1="0" y2="1">
            <stop stopColor="#27272a" />
            <stop offset="1" stopColor="#18181b" />
          </linearGradient>
        </defs>

        <rect
          className="svg-panel"
          height="368"
          rx="10"
          width="236"
          x="12"
          y="30"
        />
        <rect
          fill="url(#hero-code-fade)"
          height="328"
          rx="7"
          width="204"
          x="28"
          y="54"
        />
        <circle
          className="svg-window-dot svg-window-dot--red"
          cx="46"
          cy="75"
          r="4"
        />
        <circle
          className="svg-window-dot svg-window-dot--amber"
          cx="60"
          cy="75"
          r="4"
        />
        <circle
          className="svg-window-dot svg-window-dot--green"
          cx="74"
          cy="75"
          r="4"
        />
        <text className="svg-caption" x="94" y="79">
          checkout.ts
        </text>
        <text className="svg-line-number" x="44" y="116">
          01
        </text>
        <text className="svg-code svg-code--violet" x="67" y="116">
          export function
        </text>
        <text className="svg-code" x="67" y="135">
          checkout(cart) {"{"}
        </text>
        <text className="svg-line-number" x="44" y="164">
          02
        </text>
        <text className="svg-code svg-code--amber" x="67" y="164">
          if
        </text>
        <text className="svg-code" x="82" y="164">
          {" "}
          (!cart.items.length)
        </text>
        <text className="svg-line-number" x="44" y="185">
          03
        </text>
        <text className="svg-code svg-code--red" x="67" y="185">
          throw
        </text>
        <text className="svg-code" x="102" y="185">
          {" "}
          new EmptyCart()
        </text>
        <text className="svg-line-number" x="44" y="214">
          04
        </text>
        <text className="svg-code svg-code--sky" x="67" y="214">
          for
        </text>
        <text className="svg-code" x="88" y="214">
          {" "}
          (const item of cart)
        </text>
        <text className="svg-line-number" x="44" y="235">
          05
        </text>
        <text className="svg-code" x="67" y="235">
          {" "}
          reserve(item)
        </text>
        <text className="svg-line-number" x="44" y="264">
          06
        </text>
        <text className="svg-code svg-code--emerald" x="67" y="264">
          return
        </text>
        <text className="svg-code" x="108" y="264">
          {" "}
          payment()
        </text>
        <text className="svg-line-number" x="44" y="285">
          07
        </text>
        <text className="svg-code" x="67" y="285">
          {"}"}
        </text>
        <text className="svg-footnote" x="45" y="350">
          TypeScript source
        </text>

        <path
          className="svg-connection svg-connection--muted"
          d="M250 209 H302"
          markerEnd="url(#hero-arrow)"
        />
        <text className="svg-connector-label" x="259" y="195">
          AST facts
        </text>

        <path
          className="svg-connection"
          d="M352 108 V137"
          markerEnd="url(#hero-arrow)"
        />
        <path
          className="svg-connection"
          d="M352 199 V238"
          markerEnd="url(#hero-arrow)"
        />
        <path
          className="svg-connection svg-connection--red"
          d="M414 168 H513"
          markerEnd="url(#hero-arrow)"
        />
        <path
          className="svg-connection svg-connection--sky"
          d="M352 300 V335"
          markerEnd="url(#hero-arrow)"
        />
        <path
          className="svg-connection svg-connection--sky svg-connection--dashed"
          d="M316 270 C271 270 271 407 352 407 C433 407 433 270 388 270"
          markerEnd="url(#hero-arrow)"
        />

        <rect
          className="svg-node svg-node--violet"
          height="48"
          rx="8"
          width="150"
          x="277"
          y="60"
        />
        <text className="svg-node-label" x="352" y="83">
          checkout(cart)
        </text>
        <text className="svg-node-meta" x="352" y="98">
          function entry
        </text>

        <path
          className="svg-decision"
          d="M352 136 L414 168 L352 200 L290 168 Z"
        />
        <text className="svg-node-label" x="352" y="166">
          items?
        </text>
        <text className="svg-node-meta" x="352" y="181">
          branch
        </text>
        <text className="svg-branch-label" x="426" y="160">
          empty
        </text>
        <text className="svg-branch-label" x="366" y="220">
          has items
        </text>

        <rect
          className="svg-node svg-node--red"
          height="48"
          rx="8"
          width="122"
          x="514"
          y="144"
        />
        <text className="svg-node-label" x="575" y="165">
          EmptyCart
        </text>
        <text className="svg-node-meta" x="575" y="181">
          throw exit
        </text>

        <rect
          className="svg-node svg-node--sky"
          height="62"
          rx="8"
          width="150"
          x="277"
          y="238"
        />
        <text className="svg-node-label" x="352" y="263">
          reserve(item)
        </text>
        <text className="svg-node-meta" x="352" y="281">
          loop body
        </text>
        <text className="svg-branch-label" x="441" y="350">
          next item
        </text>

        <rect
          className="svg-node svg-node--emerald"
          height="48"
          rx="8"
          width="150"
          x="277"
          y="335"
        />
        <text className="svg-node-label" x="352" y="356">
          payment()
        </text>
        <text className="svg-node-meta" x="352" y="373">
          return exit
        </text>
      </svg>
      <figcaption>
        <span className="live-dot" aria-hidden="true" />
        Static example · every node has a source fact behind it
      </figcaption>
    </figure>
  );
}

export default function Home() {
  return (
    <>
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <header className="site-header" id="top">
        <a aria-label="Abstract Flow home" className="wordmark" href="#top">
          <span className="wordmark-mark" aria-hidden="true">
            ⌁
          </span>
          Abstract Flow
        </a>
        <nav aria-label="Primary navigation">
          <a className="header-link" href={repositoryUrl}>
            View source <span aria-hidden="true">↗</span>
          </a>
        </nav>
      </header>

      <main id="main-content">
        <section className="hero section-shell" aria-labelledby="hero-title">
          <div className="hero-copy">
            <p className="eyebrow">Local · deterministic · TypeScript</p>
            <h1 id="hero-title">See where your code goes.</h1>
            <p className="hero-intro">
              Abstract Flow maps TypeScript source into readable control-flow
              diagrams—branches, calls, loops, returns, and error exits—without
              an LLM in the middle.
            </p>
            <div className="action-row">
              <a className="button button--primary" href={repositoryUrl}>
                View source <span aria-hidden="true">↗</span>
              </a>
              <a className="button button--secondary" href="#install">
                <span className="button-label">Install</span>
                <code>{packageName}</code>
              </a>
            </div>
            <dl className="hero-meta">
              <div>
                <dt>Input</dt>
                <dd>TypeScript AST</dd>
              </div>
              <div>
                <dt>Output</dt>
                <dd>Control-flow graph</dd>
              </div>
              <div>
                <dt>Runtime</dt>
                <dd>Your machine</dd>
              </div>
            </dl>
          </div>
          <HeroDiagram />
        </section>

        <section
          className="evidence section-shell"
          aria-labelledby="evidence-title"
        >
          <div className="section-heading">
            <p className="eyebrow">Evidence, not inference</p>
            <h2 id="evidence-title">
              Source in. Facts out. Flow made visible.
            </h2>
            <p>
              Abstract Flow records the structural facts that lead to each edge,
              so the diagram stays grounded in the source you are reading.
            </p>
          </div>

          <div className="evidence-grid">
            <article
              className="code-window"
              aria-label="Example TypeScript source"
            >
              <header className="code-window-header">
                <span className="window-lights" aria-hidden="true">
                  <i />
                  <i />
                  <i />
                </span>
                <code>src/checkout.ts</code>
              </header>
              <pre>
                <code>
                  <span className="line">
                    <i>12</i>
                    <b>if</b> (!cart.items.length) {"{"}
                  </span>
                  {"\n"}
                  <span className="line">
                    <i>13</i> <b>throw</b> <em>new</em> EmptyCart();
                  </span>
                  {"\n"}
                  <span className="line">
                    <i>14</i>
                    {"}"}
                  </span>
                  {"\n"}
                  <span className="line">
                    <i>15</i>
                  </span>
                  {"\n"}
                  <span className="line">
                    <i>16</i>
                    <b>for</b> (<em>const</em> item <em>of</em> cart.items){" "}
                    {"{"}
                  </span>
                  {"\n"}
                  <span className="line">
                    <i>17</i> reserve(item);
                  </span>
                  {"\n"}
                  <span className="line">
                    <i>18</i>
                    {"}"}
                  </span>
                  {"\n"}
                  <span className="line">
                    <i>19</i>
                  </span>
                  {"\n"}
                  <span className="line">
                    <i>20</i>
                    <b>return</b> payment();
                  </span>
                </code>
              </pre>
            </article>

            <ol
              className="evidence-flow"
              aria-label="Abstract Flow analysis stages"
            >
              <li>
                <span className="stage-index">01</span>
                <div className="stage-card stage-card--source">
                  <span className="stage-kicker">Source</span>
                  <strong>checkout.ts</strong>
                  <code>lines 12–20</code>
                </div>
              </li>
              <li>
                <span className="stage-index">02</span>
                <div className="stage-card stage-card--facts">
                  <span className="stage-kicker">AST facts</span>
                  <strong>branch · throw · loop</strong>
                  <code>anchors retained</code>
                </div>
              </li>
              <li>
                <span className="stage-index">03</span>
                <div className="stage-card stage-card--flow">
                  <span className="stage-kicker">Flow graph</span>
                  <strong>12 nodes · 14 edges</strong>
                  <code>paths labeled</code>
                </div>
              </li>
            </ol>
          </div>
        </section>

        <section
          className="differentiators section-shell"
          aria-labelledby="difference-title"
        >
          <div className="section-heading section-heading--compact">
            <p className="eyebrow">Built for inspection</p>
            <h2 id="difference-title">Control flow you can verify.</h2>
          </div>
          <div className="card-grid">
            <article className="difference-card">
              <span className="card-index">01</span>
              <h3>Deterministic analysis</h3>
              <p>
                The same source produces the same graph. AST facts go in; mapped
                flow comes out.
              </p>
            </article>
            <article className="difference-card">
              <span className="card-index">02</span>
              <h3>Local source context</h3>
              <p>
                Analyze a project where it lives. Routes, calls, branches, and
                throws stay connected to source.
              </p>
            </article>
            <article className="difference-card">
              <span className="card-index">03</span>
              <h3>Navigable control flow</h3>
              <p>
                Follow an entrypoint through decisions, loops, functions, and
                explicit error exits.
              </p>
            </article>
          </div>
        </section>

        <section
          className="package-section section-shell"
          id="package"
          aria-labelledby="package-title"
        >
          <div>
            <p className="eyebrow">Package identity</p>
            <h2 id="package-title">Keep the source in the conversation.</h2>
            <p>
              Abstract Flow ships as a local CLI and a Bun server export in{" "}
              <code>{packageName}</code>. The first release will make the
              command available on npm.
            </p>
          </div>
          <div className="package-actions">
            <code className="package-name">{packageName}</code>
            <a className="button button--primary" href={repositoryUrl}>
              Follow the source <span aria-hidden="true">↗</span>
            </a>
          </div>
        </section>

        <section
          className="install-section section-shell"
          id="install"
          aria-labelledby="install-title"
        >
          <div className="section-heading section-heading--compact">
            <p className="eyebrow">Install locally</p>
            <h2 id="install-title">Put the flow beside your code.</h2>
            <p>
              The CLI runs locally. The skill gives a coding agent a short,
              deterministic path to routes, callers, branches, and SVG flows.
            </p>
          </div>

          <div className="install-grid">
            <article className="install-card">
              <span className="card-index">01</span>
              <h3>Run the CLI</h3>
              <p>
                Try it without changing your project, or add it as a local
                development dependency.
              </p>
              <div className="install-command">
                <span className="install-label">Try now</span>
                <pre>
                  <code>bunx abstract-flow</code>
                </pre>
              </div>
              <div className="install-command">
                <span className="install-label">Project install</span>
                <pre>
                  <code>{`bun add --dev abstract-flow
bunx abstract-flow`}</code>
                </pre>
              </div>
              <div className="install-command">
                <span className="install-label">Uninstall</span>
                <pre>
                  <code>bun remove abstract-flow</code>
                </pre>
              </div>
              <p className="install-note">
                A <code>bunx</code>-only run does not add a project dependency.
              </p>
            </article>

            <article className="install-card">
              <span className="card-index">02</span>
              <h3>Teach your coding agent</h3>
              <p>
                Copy the portable <code>SKILL.md</code> directory into the skill
                root your agent already scans.
              </p>
              <div className="install-command">
                <span className="install-label">Install skill</span>
                <pre>
                  <code>{skillInstall}</code>
                </pre>
              </div>
              <div className="install-command">
                <span className="install-label">Uninstall skill</span>
                <pre>
                  <code>{skillUninstall}</code>
                </pre>
              </div>
              <p className="install-note">
                Removing the skill does not remove project code or generated
                diagrams.
              </p>
            </article>
          </div>
        </section>
      </main>

      <footer className="site-footer section-shell">
        <span>Abstract Flow analyzes code locally.</span>
        <a href={repositoryUrl}>
          Repository <span aria-hidden="true">↗</span>
        </a>
      </footer>
    </>
  );
}
