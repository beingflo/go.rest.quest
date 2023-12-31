import {
  Component,
  createSignal,
  For,
  Match,
  onCleanup,
  Show,
  Switch,
} from "solid-js";
import { tinykeys } from "tinykeys";
import Help from "./Help";
import Configuration from "./Configuration";
import { useStore } from "./store";
import { validateEvent } from "./utils";
import Link from "./Link";
import NewLink from "./NewLink";
import Import from "./Import";
import { ephemeralStore } from "./ephemeralStore";
import { Feedback } from "./Feedback";

const App: Component = () => {
  const [state, { cycleScreen, accessLink, syncState }] = useStore();
  const [newLinkMode, setNewLinkMode] = createSignal(false);
  const [searchTerm, setSearchTerm] = createSignal("");
  const [editLink, setEditLink] = createSignal(null);
  const [selectedLinkIdx, setSelectedLinkIdx] = createSignal(0);

  let searchInputRef;
  let newLinkInputRef;

  const urlParams = new URLSearchParams(window.location.search);
  const searchUrlParam = urlParams.get("q");

  const links = () => {
    const visibleLinks = state.links?.filter((link) => !link.deletedAt) ?? [];
    const terms = searchTerm()?.split(" ");
    const filteredLinks = visibleLinks?.filter((link) =>
      terms.every(
        (term) =>
          link.url?.toLowerCase()?.includes(term?.toLowerCase()) ||
          link.description?.toLowerCase()?.includes(term?.toLowerCase())
      )
    );
    filteredLinks?.sort(
      (a, b) =>
        (b.lastAccessedAt ?? b.createdAt) - (a.lastAccessedAt ?? a.createdAt)
    );
    return filteredLinks;
  };

  const onNew = () => {
    setNewLinkMode(true);
    newLinkInputRef?.focus();
  };

  const followLink = (newTab: boolean) => {
    if (newLinkMode() || editLink()) {
      return;
    }
    const link = links()[selectedLinkIdx()];
    accessLink(link?.id);
    setSelectedLinkIdx(0);

    if (!link) {
      return;
    }

    if (newTab) {
      window.open(link?.url);
      setSearchTerm("");
    } else {
      location.href = link?.url;
    }
  };

  if (searchUrlParam) {
    setSearchTerm(searchUrlParam);
    if (links().length === 1) {
      followLink(false);
    }
  }

  const cleanup = tinykeys(window, {
    n: validateEvent(onNew),
    Escape: () => {
      setNewLinkMode(false);
      setEditLink(null);
      searchInputRef.blur();
    },
    Enter: () => followLink(false),
    "$mod+Enter": () => followLink(true),
    h: validateEvent(() => cycleScreen("help")),
    c: validateEvent(() => cycleScreen("config")),
    f: validateEvent(() => cycleScreen("feedback")),
    s: validateEvent(syncState),
    i: validateEvent(() => cycleScreen("import")),
    "$mod+k": validateEvent(() => {
      searchInputRef.focus();
    }),
    ArrowUp: (event) => {
      setSelectedLinkIdx((oldIdx) => Math.max(oldIdx - 1, 0));
      event.preventDefault();
    },
    ArrowDown: (event) => {
      setSelectedLinkIdx((oldIdx) => Math.min(oldIdx + 1, links().length - 1));
      event.preventDefault();
    },
  });

  onCleanup(cleanup);

  return (
    <Switch
      fallback={
        <>
          <div class="flex flex-col w-full p-2 md:p-4">
            <div class="w-full max-w-8xl mx-auto">
              <form onSubmit={(event) => event.preventDefault()}>
                <input
                  type="text"
                  ref={searchInputRef}
                  class="focus:outline-none w-full text-md placeholder:font-thin block mb-12 border-0 focus:ring-0"
                  placeholder="Go somewhere..."
                  autofocus
                  value={searchTerm()}
                  onInput={(event) => {
                    setSearchTerm(event?.currentTarget?.value);
                    setSelectedLinkIdx(0);
                  }}
                />
              </form>
              <div class="flex flex-col gap-4">
                <Show when={newLinkMode()}>
                  <NewLink
                    ref={newLinkInputRef}
                    onEditEnd={() => setNewLinkMode(false)}
                  />
                </Show>
                <For each={links()}>
                  {(link, idx) => (
                    <Show
                      when={link.id === editLink()?.id}
                      fallback={
                        <Link
                          id={link.id}
                          url={link.url}
                          description={link.description}
                          lastAccessedAt={link.lastAccessedAt}
                          numAccessed={link.numAccessed}
                          selected={idx() === selectedLinkIdx()}
                          showControls={true}
                          onEdit={(link) => {
                            setEditLink(link);
                          }}
                        />
                      }
                    >
                      <NewLink
                        ref={newLinkInputRef}
                        editLink={editLink()}
                        onEditEnd={() => {
                          setEditLink(null);
                        }}
                      />
                    </Show>
                  )}
                </For>
              </div>
            </div>
          </div>
          <Show when={ephemeralStore.showToast}>
            <div class="fixed bottom-0 right-0 grid gap-x-2 grid-cols-2 bg-white p-2 font-light text-sm">
              <p class="text-right">new</p>
              <p>
                {ephemeralStore?.new[0]} local, {ephemeralStore?.new[1]} remote
              </p>
              <p class="text-right">old</p>
              <p>
                {ephemeralStore?.dropped[0]} local, {ephemeralStore?.dropped[1]}{" "}
                remote
              </p>
            </div>
          </Show>
        </>
      }
    >
      <Match when={state.screen === "help"}>
        <Help />
      </Match>
      <Match when={state.screen === "config"}>
        <Configuration />
      </Match>
      <Match when={state.screen === "import"}>
        <Import />
      </Match>
      <Match when={state.screen === "feedback"}>
        <Feedback />
      </Match>
    </Switch>
  );
};

export default App;
