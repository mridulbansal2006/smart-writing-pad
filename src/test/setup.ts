// jsdom has no IndexedDB, so sample-storage tests run against an in-memory
// implementation with the same API surface.
import 'fake-indexeddb/auto';
