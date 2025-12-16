<!--
	WikiLambda Vue component - About Widget.

	@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
	@license MIT
-->
<template>
	<wl-widget-base class="ext-wikilambda-app-about" data-testid="about-widget">
		<!-- Widget header -->
		<template #header>
			{{ i18n( 'wikilambda-about-widget-title' ).text() }}
		</template>
		<template #header-action>
			<cdx-button
				v-if="isEditing && !edit"
				class="ext-wikilambda-app-about__button-cancel"
				action="default"
				@click="resetEditState"
			>
				{{ i18n( 'wikilambda-cancel' ).text() }}
			</cdx-button>
			<cdx-button
				v-if="isEditing && !edit"
				class="ext-wikilambda-app-about__button-publish"
				action="progressive"
				@click="saveAllChanges"
			>
				{{ i18n( 'wikilambda-publishnew' ).text() }}
			</cdx-button>
		</template>

		<!-- Widget main -->
		<template #main>
			<!-- Language accordion -->
			<cdx-accordion
				v-for="( displayLanguage, index ) in displayLanguages"
				:key="displayLanguage.zid"
				:ref="`block-${ index }`"
				:action-icon="( canEditObject && !displayLanguage.edit ) ? iconEdit : null"
				:open="displayLanguage.open"
				class="ext-wikilambda-app-about__accordion"
				action-always-visible
				data-testid="about-language-accordion"
				:action-button-label="i18n( 'wikilambda-about-widget-edit-button' ).text()"
				@action-button-click="initializeEdit( index )"
				@toggle="displayLanguage.open = $event"
			>
				<template #title>
					{{ displayData[ index ].title }}
				</template>
				<template #description>
					<span :class="accordionDescriptionClass( displayData[ index ].hasName )">
						{{ displayData[ index ].name }}
					</span>
				</template>
				<wl-about-language-block
					:edit="displayLanguage.edit"
					:language="displayLanguage.zid"
					:is-function="isFunction"
					:view-data="displayData[ index ].viewData"
					:edit-data="displayLanguage.editData"
					:field-langs="fieldLangs"
					@update-edit-value="updateEditValue"
					@change-value="saveFieldChange"
				></wl-about-language-block>
			</cdx-accordion>

			<!-- Dialogs -->
			<wl-about-languages-dialog
				:open="showLanguagesDialog"
				@add-language="addLanguage"
				@close-dialog="showLanguagesDialog = false"
			></wl-about-languages-dialog>
			<wl-publish-dialog
				v-if="!edit"
				:show-dialog="showPublishDialog"
				@close-dialog="cancelPublish"
			></wl-publish-dialog>
		</template>

		<!-- Widget footer -->
		<template #footer>
			<div class="ext-wikilambda-app-about__button-languages">
				<cdx-button data-testid="languages-button" @click="showLanguagesDialog = true">
					<cdx-icon :icon="iconLanguage"></cdx-icon>
					{{ i18n( 'wikilambda-about-widget-language-count-button', languageCount ).text() }}
				</cdx-button>
			</div>
		</template>
	</wl-widget-base>
</template>

<script>
const { computed, defineComponent, inject, onMounted, ref, watch } = require( 'vue' );

const icons = require( '../../../../lib/icons.json' );
const Constants = require( '../../../Constants.js' );
const usePageTitle = require( '../../../composables/usePageTitle.js' );
const useMainStore = require( '../../../store/index.js' );

// Base components
const WidgetBase = require( '../../base/WidgetBase.vue' );
// Widget components
const AboutLanguageBlock = require( './AboutLanguageBlock.vue' );
const AboutLanguagesDialog = require( './AboutLanguagesDialog.vue' );
const PublishDialog = require( '../publish/PublishDialog.vue' );
// Codex components
const { CdxAccordion, CdxButton, CdxIcon } = require( '../../../../codex.js' );

module.exports = exports = defineComponent( {
	name: 'wl-about-widget',
	components: {
		'cdx-accordion': CdxAccordion,
		'cdx-button': CdxButton,
		'cdx-icon': CdxIcon,
		'wl-about-language-block': AboutLanguageBlock,
		'wl-about-languages-dialog': AboutLanguagesDialog,
		'wl-publish-dialog': PublishDialog,
		'wl-widget-base': WidgetBase
	},
	props: {
		edit: {
			type: Boolean,
			required: true
		},
		type: {
			type: String,
			required: true
		}
	},
	emits: [ 'edit-multilingual-data', 'publish-multilingual-data', 'cancel-edit' ],
	setup( props, { emit } ) {
		const i18n = inject( 'i18n' );
		const store = useMainStore();
		const { updatePageTitle } = usePageTitle();

		// Constants and configuration
		const iconEdit = icons.cdxIconEdit;
		const iconLanguage = icons.cdxIconLanguage;

		// Language data
		const displayLanguages = ref( [] );

		/**
		 * Returns whether the current object is a function
		 *
		 * @return {boolean}
		 */
		const isFunction = computed( () => props.type === Constants.Z_FUNCTION );

		/**
		 * Returns the available languages for each field
		 *
		 * @return {Object}
		 */
		const fieldLangs = computed( () => {
			const { name, description, aliases, inputs } = store.getMultilingualDataLanguages;
			return { name, description, aliases, inputs };
		} );

		/**
		 * Returns a list of all the language Zids that are present in
		 * the multilingual data collection (must have at least a name,
		 * a description, a set of aliases or an input label in case the
		 * object is a function).
		 *
		 * @return {Array}
		 */
		const allLangs = computed( () => store.getMultilingualDataLanguages.all );

		/**
		 * Returns the count of the list of unique available languages
		 *
		 * @return {number}
		 */
		const languageCount = computed( () => allLangs.value.length );

		/**
		 * Returns the list of fallback languages in their Zid
		 * representation, excluding the first (user selected language)
		 *
		 * @return {Array}
		 */
		const fallbackLanguageZids = computed( () => store.getFallbackLanguageZids.slice( 1 ) );

		/**
		 * Returns the multilingual data for a given language
		 *
		 * @param {string} langZid
		 * @return {Object}
		 */
		function getMultilingualDataForLanguage( langZid ) {
			const name = store.getZPersistentName( langZid );
			const description = store.getZPersistentDescription( langZid );
			const aliases = store.getZPersistentAlias( langZid );
			const inputs = isFunction.value ? store.getZFunctionInputLabels( langZid ) : [];

			const data = {
				name: {
					keyPath: name ? name.keyPath : undefined,
					value: name ? name.value : ''
				},
				description: {
					keyPath: description ? description.keyPath : undefined,
					value: description ? description.value : ''
				},
				aliases: {
					keyPath: aliases ? aliases.keyPath : undefined,
					value: aliases ? aliases.value : []
				},
				inputs
			};

			return {
				title: store.getLabelData( langZid ).label,
				hasName: !!data.name.value,
				name: data.name.value || i18n( 'wikilambda-editor-default-name' ).text(),
				viewData: data
			};
		}

		/**
		 * Returns a computed array of the multilingual data for
		 * the languages selected for display, as per their persisted
		 * state in the global store.
		 *
		 * @return {Array}
		 */
		const displayData = computed( () => displayLanguages.value.map(
			( lang ) => getMultilingualDataForLanguage( lang.zid )
		) );

		/**
		 * Initializes the collection of languages to display in
		 * the About widget, according to the following logic:
		 * * The user language will always be shown first, in an expanded state.
		 * * If the user language doesn't have complete multilingual data, one or
		 *   more fallback languges will be added to the display.
		 * Each item also includes their local state:
		 * * edit state flag
		 * * edit data values
		 */
		function initializeDisplayLanguages() {
			// 1. Always start with user language
			displayLanguages.value = [ {
				zid: store.getUserLangZid,
				edit: props.edit,
				open: true,
				editData: props.edit ?
					editCopy( getMultilingualDataForLanguage( store.getUserLangZid ).viewData ) :
					undefined
			} ];

			// 2. If important info in main language is complete, exit
			let missingName = !fieldLangs.value.name.includes( store.getUserLangZid );
			let missingInputs = fieldLangs.value.inputs.filter( ( langs ) => !langs.includes( store.getUserLangZid ) );
			if ( !missingName && missingInputs.length === 0 ) {
				return;
			}

			// 3. Collect fallback languages to cover up for missing fields
			let addBlocks = [];
			for ( const langZid of fallbackLanguageZids.value ) {
				// 3.1. If everything is complete, exit loop
				if ( !missingName && missingInputs.length === 0 ) {
					break;
				}

				// 3.2. If we are still missing a fallback name, check if we have it in this language
				if ( missingName ) {
					if ( fieldLangs.value.name.includes( langZid ) ) {
						addBlocks.push( langZid );
						missingName = false;
					}
				}

				// 3.3. For each missing input labels, check if we have it in this language
				const availableInputs = missingInputs.filter( ( input ) => input.includes( langZid ) );
				if ( availableInputs.length > 0 ) {
					addBlocks.push( langZid );
					missingInputs = missingInputs.filter( ( input ) => !input.includes( langZid ) );
				}
			}

			// 4. Remove duplicates and add fallback languages to language blocks
			addBlocks = [ ...new Set( addBlocks ) ];
			addBlocks.forEach( ( langZid ) => {
				displayLanguages.value.push( {
					zid: langZid,
					edit: props.edit,
					open: false,
					editData: props.edit ?
						editCopy( getMultilingualDataForLanguage( langZid ).viewData ) :
						undefined
				} );
			} );
		}

		// Editing
		/**
		 * Returns whether the user can edit the function
		 *
		 * @return {boolean}
		 */
		const canEditObject = computed( () => store.isCreateNewPage ? true : store.isUserLoggedIn );

		/**
		 * Returns whether any of the language blocks is being edited
		 *
		 * @return {boolean}
		 */
		const isEditing = computed( () => !!displayLanguages.value.find( ( item ) => item.edit ) );

		/**
		 * Creates a deep copy of the edit data
		 *
		 * @param {Object} data
		 * @return {Object}
		 */
		function editCopy( data ) {
			return JSON.parse( JSON.stringify( data ) );
		}

		/**
		 * Initialize the local editable data collection for a given
		 * language block given its index.
		 *
		 * @param {number} index
		 */
		function initializeEdit( index ) {
			displayLanguages.value[ index ].edit = true;
			displayLanguages.value[ index ].open = true;
			displayLanguages.value[ index ].editData = editCopy( displayData.value[ index ].viewData );
			emit( 'edit-multilingual-data' );
		}

		/**
		 * Persists locally all the changes in the Language Block fields
		 *
		 * @param {Object} payload
		 * @param {Object} payload.data
		 * @param {Array|string} payload.value
		 */
		function updateEditValue( payload ) {
			payload.data.value = payload.value;
		}

		// Save field changes
		/**
		 * Persist in the global state a new value for name in the given language
		 *
		 * @param {string|undefined} itemKeyPath
		 * @param {string} value
		 * @param {string} lang
		 */
		function persistName( itemKeyPath, value, lang ) {
			const parentKeyPath = [
				Constants.STORED_OBJECTS.MAIN,
				Constants.Z_PERSISTENTOBJECT_LABEL,
				Constants.Z_MULTILINGUALSTRING_VALUE
			];
			store.setZMonolingualString( { parentKeyPath, itemKeyPath, value, lang } );
			// After persisting in the state, update the page title
			updatePageTitle();
			store.setDirty( true );
		}

		/**
		 * Persist in the global state a new value for description in the given language
		 *
		 * @param {string|undefined} itemKeyPath
		 * @param {string} value
		 * @param {string} lang
		 */
		function persistDescription( itemKeyPath, value, lang ) {
			const parentKeyPath = [
				Constants.STORED_OBJECTS.MAIN,
				Constants.Z_PERSISTENTOBJECT_DESCRIPTION,
				Constants.Z_MULTILINGUALSTRING_VALUE
			];
			store.setZMonolingualString( { parentKeyPath, itemKeyPath, value, lang } );
			store.setDirty( true );
		}

		/**
		 * Persist in the global state a new value for aliases in the given language
		 *
		 * @param {string|undefined} itemKeyPath
		 * @param {Array} value
		 * @param {string} lang
		 */
		function persistAlias( itemKeyPath, value, lang ) {
			const parentKeyPath = [
				Constants.STORED_OBJECTS.MAIN,
				Constants.Z_PERSISTENTOBJECT_ALIASES,
				Constants.Z_MULTILINGUALSTRINGSET_VALUE
			];
			store.setZMonolingualStringset( { parentKeyPath, itemKeyPath, value, lang } );
			store.setDirty( true );
		}

		/**
		 * Persist in the global state a new value for an input label in the given language
		 *
		 * @param {string|undefined} itemKeyPath
		 * @param {number} index
		 * @param {string} value
		 * @param {string} lang
		 */
		function persistInputLabel( itemKeyPath, index, value, lang ) {
			const parentKeyPath = [
				Constants.STORED_OBJECTS.MAIN,
				Constants.Z_PERSISTENTOBJECT_VALUE,
				Constants.Z_FUNCTION_ARGUMENTS,
				index,
				Constants.Z_ARGUMENT_LABEL,
				Constants.Z_MULTILINGUALSTRING_VALUE
			];
			store.setZMonolingualString( { parentKeyPath, itemKeyPath, value, lang } );
			store.setDirty( true );
		}

		/**
		 * For each language being edited, persists all changes
		 * in the store.
		 */
		function persistState() {
			displayLanguages.value.forEach( ( lang, index ) => {
				// If language block is in edit mode, persist
				// all changes that have a different edit and view value.
				if ( lang.edit ) {
					const viewData = displayData.value[ index ].viewData;
					const editData = lang.editData;

					// Persist name if it changed
					if ( viewData.name.value !== editData.name.value ) {
						persistName(
							viewData.name.keyPath,
							editData.name.value,
							lang.zid
						);
					}

					// Persist description if it changed
					if ( viewData.description.value !== editData.description.value ) {
						persistDescription(
							viewData.description.keyPath,
							editData.description.value,
							lang.zid
						);
					}

					// Persist aliases if they changed
					if (
						JSON.stringify( viewData.aliases.value ) !==
						JSON.stringify( editData.aliases.value )
					) {
						persistAlias(
							viewData.aliases.keyPath,
							editData.aliases.value,
							lang.zid
						);
					}

					// Persist input labels if they changed
					for ( const input in editData.inputs ) {
						if ( viewData.inputs[ input ].value !== editData.inputs[ input ].value ) {
							persistInputLabel(
								viewData.inputs[ input ].keyPath,
								Number( input ) + 1,
								editData.inputs[ input ].value,
								lang.zid
							);
						}
					}
				}
			} );
		}

		/**
		 * Only in edit page (non functions):
		 * Persists a field change in the store and updates the page title if needed.
		 * Triggered every time that a field emits a "change" event. Field changes
		 * are persisted as they are entered, and published when the page Publish
		 * button is clicked.
		 */
		function saveFieldChange() {
			if ( !props.edit ) {
				return;
			}
			persistState();
		}

		// Languages dialog
		const showLanguagesDialog = ref( false );

		/**
		 * Adds the selected language to the collection
		 * of displayed languages.
		 *
		 * @param {string} newLang
		 */
		function addLanguage( newLang ) {
			// Ignore if already displayed
			const found = displayLanguages.value.find( ( lang ) => lang.zid === newLang );
			if ( found ) {
				return;
			}
			displayLanguages.value.push( {
				zid: newLang,
				edit: props.edit,
				open: false,
				editData: props.edit ?
					editCopy( getMultilingualDataForLanguage( newLang ).viewData ) :
					undefined
			} );
		}

		// Publish dialog
		const showPublishDialog = ref( false );

		/**
		 * Restores original view state and cancels publish
		 * action. This only happens when we are in a view page
		 * and after editing information, we proceed to publish
		 * and then we cancel.
		 */
		function cancelPublish() {
			if ( store.isDirty ) {
				store.resetMultilingualData();
			}
			showPublishDialog.value = false;
		}

		// Actions
		/**
		 * Discards all edits and sets all language blocks to view mode.
		 */
		function resetEditState() {
			displayLanguages.value.forEach( ( lang ) => {
				lang.edit = false;
				lang.editData = undefined;
			} );
		}

		/**
		 * Only in view pages (functions and others):
		 * Persists all accummulated changes in the store and initiates publish process.
		 * Triggered when user clicks the "Publish" button from the About widget header.
		 */
		function saveAllChanges() {
			if ( props.edit ) {
				return;
			}
			persistState();
			showPublishDialog.value = true;
		}

		// UI helpers
		/**
		 * Returns special class for the accordion description
		 * depending on the availability of the title.
		 *
		 * @param {boolean} hasName
		 * @return {string}
		 */
		function accordionDescriptionClass( hasName ) {
			return hasName ? '' : 'ext-wikilambda-app-about__accordion--untitled';
		}

		// Watch
		watch( fallbackLanguageZids, () => {
			initializeDisplayLanguages();
		} );

		// Lifecycle
		onMounted( () => {
			initializeDisplayLanguages();
		} );

		return {
			accordionDescriptionClass,
			addLanguage,
			canEditObject,
			cancelPublish,
			displayData,
			displayLanguages,
			fieldLangs,
			iconEdit,
			iconLanguage,
			initializeEdit,
			isEditing,
			isFunction,
			languageCount,
			resetEditState,
			saveAllChanges,
			saveFieldChange,
			showLanguagesDialog,
			showPublishDialog,
			updateEditValue,
			i18n
		};
	}
} );
</script>

<style lang="less">
@import '../../../ext.wikilambda.app.variables.less';

.ext-wikilambda-app-about {
	.ext-wikilambda-app-about__accordion--untitled {
		color: @color-placeholder;
	}

	.ext-wikilambda-app-about__button-languages {
		margin-top: @spacing-125;
	}

	.ext-wikilambda-app-about__accordion .cdx-accordion__header {
		padding-right: @spacing-125;
	}
}
</style>
