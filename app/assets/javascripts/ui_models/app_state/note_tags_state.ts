import { SNNote, ContentType, SNTag, UuidString } from '@standardnotes/snjs';
import { action, computed, makeObservable, observable } from 'mobx';
import { WebApplication } from '../application';
import { AppState } from './app_state';

export class NoteTagsState {
  autocompleteInputFocused = false;
  autocompleteSearchQuery = '';
  autocompleteTagHintFocused = false;
  autocompleteTagResults: SNTag[] = [];
  focusedTagResultUuid: UuidString | undefined = undefined;
  focusedTagUuid: UuidString | undefined = undefined;
  tags: SNTag[] = [];
  tagsContainerMaxWidth: number | 'auto' = 0;

  constructor(
    private application: WebApplication,
    private appState: AppState,
    appEventListeners: (() => void)[]
  ) {
    makeObservable(this, {
      autocompleteInputFocused: observable,
      autocompleteSearchQuery: observable,
      autocompleteTagHintFocused: observable,
      autocompleteTagResults: observable,
      focusedTagUuid: observable,
      focusedTagResultUuid: observable,
      tags: observable,
      tagsContainerMaxWidth: observable,

      autocompleteTagHintVisible: computed,

      clearAutocompleteSearch: action,
      focusNextTag: action,
      focusPreviousTag: action,
      setAutocompleteInputFocused: action,
      setAutocompleteSearchQuery: action,
      setAutocompleteTagHintFocused: action,
      setAutocompleteTagResults: action,
      setFocusedTagResultUuid: action,
      setFocusedTagUuid: action,
      setTags: action,
      setTagsContainerMaxWidth: action,
      reloadTags: action,
    });

    appEventListeners.push(
      application.streamItems(ContentType.Tag, () => {
        this.reloadTags();
      })
    );
  }

  get activeNote(): SNNote | undefined {
    return this.appState.notes.activeEditor?.note;
  }

  get autocompleteTagHintVisible(): boolean {
    return (
      this.autocompleteSearchQuery !== '' &&
      !this.autocompleteTagResults.some(
        (tagResult) => tagResult.title === this.autocompleteSearchQuery
      )
    );
  }

  setAutocompleteInputFocused(focused: boolean): void {
    this.autocompleteInputFocused = focused;
  }

  setAutocompleteSearchQuery(query: string): void {
    this.autocompleteSearchQuery = query;
  }

  setAutocompleteTagHintFocused(focused: boolean): void {
    this.autocompleteTagHintFocused = focused;
  }

  setAutocompleteTagResults(results: SNTag[]): void {
    this.autocompleteTagResults = results;
  }

  setFocusedTagUuid(tagUuid: UuidString | undefined): void {
    this.focusedTagUuid = tagUuid;
  }

  setFocusedTagResultUuid(tagUuid: UuidString | undefined): void {
    this.focusedTagResultUuid = tagUuid;
  }

  setTags(tags: SNTag[]): void {
    this.tags = tags;
  }

  setTagsContainerMaxWidth(width: number): void {
    this.tagsContainerMaxWidth = width;
  }

  clearAutocompleteSearch(): void {
    this.setAutocompleteSearchQuery('');
    this.searchActiveNoteAutocompleteTags();
  }

  async createAndAddNewTag(): Promise<void> {
    const newTag = await this.application.findOrCreateTag(
      this.autocompleteSearchQuery
    );
    await this.addTagToActiveNote(newTag);
    this.clearAutocompleteSearch();
  }

  focusNextTag(tag: SNTag): void {
    const nextTagIndex = this.getTagIndex(tag, this.tags) + 1;
    if (nextTagIndex > -1 && this.tags.length > nextTagIndex) {
      const nextTag = this.tags[nextTagIndex];
      this.setFocusedTagUuid(nextTag.uuid);
    }
  }

  focusNextTagResult(tagResult: SNTag): void {
    const nextTagResultIndex =
      this.getTagIndex(tagResult, this.autocompleteTagResults) + 1;
    if (
      nextTagResultIndex > -1 &&
      this.autocompleteTagResults.length > nextTagResultIndex
    ) {
      const nextTagResult = this.autocompleteTagResults[nextTagResultIndex];
      this.setFocusedTagResultUuid(nextTagResult.uuid);
    }
  }

  focusPreviousTag(tag: SNTag): void {
    const previousTagIndex = this.getTagIndex(tag, this.tags) - 1;
    if (previousTagIndex > -1 && this.tags.length > previousTagIndex) {
      const previousTag = this.tags[previousTagIndex];
      this.setFocusedTagUuid(previousTag.uuid);
    }
  }

  focusPreviousTagResult(tagResult: SNTag): void {
    const previousTagResultIndex =
      this.getTagIndex(tagResult, this.autocompleteTagResults) - 1;
    if (
      previousTagResultIndex > -1 &&
      this.autocompleteTagResults.length > previousTagResultIndex
    ) {
      const previousTagResult =
        this.autocompleteTagResults[previousTagResultIndex];
      this.setFocusedTagResultUuid(previousTagResult.uuid);
    }
  }

  searchActiveNoteAutocompleteTags(): void {
    const newResults = this.application.searchTags(
      this.autocompleteSearchQuery,
      this.activeNote
    );
    this.setAutocompleteTagResults(newResults);
  }

  getTagIndex(tag: SNTag, tagsArr: SNTag[]): number {
    return tagsArr.findIndex((t) => t.uuid === tag.uuid);
  }

  reloadTags(): void {
    const { activeNote } = this;
    if (activeNote) {
      const tags = this.application.getSortedTagsForNote(activeNote);
      this.setTags(tags);
    }
  }

  reloadTagsContainerMaxWidth(): void {
    const EDITOR_ELEMENT_ID = 'editor-column';
    const editorWidth = document.getElementById(EDITOR_ELEMENT_ID)?.clientWidth;
    if (editorWidth) {
      this.setTagsContainerMaxWidth(editorWidth);
    }
  }

  async addTagToActiveNote(tag: SNTag): Promise<void> {
    const { activeNote } = this;
    if (activeNote) {
      await this.application.changeItem(tag.uuid, (mutator) => {
        mutator.addItemAsRelationship(activeNote);
      });
      this.application.sync();
      this.reloadTags();
    }
  }

  async removeTagFromActiveNote(tag: SNTag): Promise<void> {
    const { activeNote } = this;
    if (activeNote) {
      await this.application.changeItem(tag.uuid, (mutator) => {
        mutator.removeItemAsRelationship(activeNote);
      });
      this.application.sync();
      this.reloadTags();
    }
  }
}
