<!--
	WikiLambda Vue component - About Widget.

	@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
	@license MIT
-->
<template>
	<wl-widget-base class="ext-wikilambda-app-about" data-testid="about-widget">
		<!-- Widget header -->
		<template #header>
			{{ $i18n( 'wikilambda-about-widget-title' ).text() }}
		</template>
		<template #header-action>
			<cdx-button
				v-if="isEditing && !edit"
				class="ext-wikilambda-app-about__button-cancel"
				action="default"
				@click="resetEditState"
			>
				{{ $i18n( 'wikilambda-cancel' ).text() }}
			</cdx-button>
			<cdx-button
				v-if="isEditing & !edit"
				class="ext-wikilambda-app-about__button-publish"
				action="progressive"
				@click="saveAllChanges"
			>
				{{ $i18n( 'wikilambda-publishnew' ).text() }}
			</cdx-button>
		</template>

		<!-- Widget main -->
		<template #main>
			<!-- Language accordion -->
			<cdx-accordion
				v-for="( displayLanguage, index ) in displayLanguages"
				:key="displayLanguage.zid"
				:ref="'block-' + index"
				:action-icon="( canEditObject && !displayLanguage.edit ) ? icons.cdxIconEdit : null"
				:open="displayLanguage.open"
				class="ext-wikilambda-app-about__accordion"
				action-always-visible
				data-testid="about-language-accordion"
				:action-button-label="$i18n( 'wikilambda-about-widget-edit-button' ).text()"
				@action-button-click="initializeEdit( index )"
			>
				<template #title>
					{{ displayLanguageData[ index ].title }}
				</template>
				<template #description>
					<span :class="accordionDescriptionClass( displayLanguageData[ index ].hasName )">
						{{ displayLanguageData[ index ].name }}
					</span>
				</template>
				<wl-about-language-block
					:edit="displayLanguage.edit"
					:language="displayLanguage.zid"
					:is-function="isFunction"
					:view-data="displayLanguageData[ index ].viewData"
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
				<cdx-button data-testid="languages-button" @click="openLanguagesDialog">
					<cdx-icon :icon="icons.cdxIconLanguage"></cdx-icon>
					{{ $i18n( 'wikilambda-about-widget-language-count-button', languageCount ).text() }}
				</cdx-button>
			</div>
		</template>
	</wl-widget-base>
</template>

<script>
const { defineComponent } = require( 'vue' );
const { mapActions, mapState } = require( 'pinia' );
const { CdxAccordion, CdxButton, CdxIcon } = require( '../../../../codex.js' );
const AboutLanguageBlock = require( './AboutLanguageBlock.vue' );
const AboutLanguagesDialog = require( './AboutLanguagesDialog.vue' );
const Constants = require( '../../../Constants.js' );
const icons = require( '../../../../lib/icons.json' );
const pageTitleMixin = require( '../../../mixins/pageTitleMixin.js' );
const PublishDialog = require( '../publish/PublishDialog.vue' );
const useMainStore = require( '../../../store/index.js' );
const WidgetBase = require( '../../base/WidgetBase.vue' );

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
	mixins: [ pageTitleMixin ],
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
	data: function () {
		return {
			icons: icons,
			displayLanguages: [],
			showLanguagesDialog: false,
			showPublishDialog: false
		};
	},
	computed: Object.assign( {}, mapState( useMainStore, [
		'getFallbackLanguageZids',
		'getLabelData',
		'getMultilingualDataLanguages',
		'getRowByKeyPath',
		'getUserLangZid',
		'getZArgumentLabelForLanguage',
		'getZArgumentTypeRowId',
		'getZArgumentKey',
		'getZFunctionInputs',
		'getZFunctionInputLangs',
		'getZMonolingualTextValue',
		'getZMonolingualStringsetValues',
		'getZPersistentName',
		'getZPersistentNameLangs',
		'getZPersistentDescription',
		'getZPersistentDescriptionLangs',
		'getZPersistentAlias',
		'getZPersistentAliasLangs',
		'isCreateNewPage',
		'isDirty',
		'isUserLoggedIn'
	] ), {
		/**
		 * Returns whether the user can edit the function
		 *
		 * @return {boolean}
		 */
		canEditObject: function () {
			// TODO (T301667): restrict to only certain user roles
			return this.isCreateNewPage ? true : this.isUserLoggedIn;
		},
		/**
		 * Returns whether any of the language blocks is being edited
		 *
		 * @return {boolean}
		 */
		isEditing: function () {
			return !!this.displayLanguages.find( ( item ) => item.edit );
		},
		/**
		 * Returns the available languages for each field
		 *
		 * @return {Object}
		 */
		fieldLangs: function () {
			return {
				name: this.getZPersistentNameLangs(),
				description: this.getZPersistentDescriptionLangs(),
				aliases: this.getZPersistentAliasLangs(),
				inputs: this.getZFunctionInputLangs()
			};
		},
		/**
		 * Returns a list of all the language Zids that are present in
		 * the multilingual data collection (must have at least a name,
		 * a description, a set of aliases or an input label in case the
		 * object is a function).
		 *
		 * @return {Array}
		 */
		allLangs: function () {
			return this.getMultilingualDataLanguages();
		},
		/**
		 * Returns the count of the list of unique available languages
		 *
		 * @return {number}
		 */
		languageCount: function () {
			return this.allLangs.length;
		},
		/**
		 * Returns whether the current object is a function
		 *
		 * @return {boolean}
		 */
		isFunction: function () {
			return this.type === Constants.Z_FUNCTION;
		},
		/**
		 * Returns the list of fallback languages in their Zid
		 * representation, excluding the first (user selected language)
		 *
		 * @return {Array}
		 */
		fallbackLanguageZids: function () {
			return this.getFallbackLanguageZids.slice( 1 );
		},
		/**
		 * Returns a computed array of the multilingual data for
		 * the languages selected for display, as per their persisted
		 * state in the global store.
		 *
		 * @return {Array}
		 */
		displayLanguageData: function () {
			return this.displayLanguages
				.map( ( lang ) => this.getMultilingualDataForLanguage( lang.zid ) );
		}
	} ),
	methods: Object.assign( {}, mapActions( useMainStore, [
		'changeType',
		'removeItemFromTypedList',
		'resetMultilingualData',
		'setDirty',
		'setValueByRowIdAndPath'
	] ), {
		/**
		 * Opens the AboutLanguagesDialog
		 */
		openLanguagesDialog: function () {
			this.showLanguagesDialog = true;
		},
		/**
		 * Adds the selected language to the collection
		 * of displayed languages.
		 *
		 * @param {string} newLang
		 */
		addLanguage: function ( newLang ) {
			// Ignore if already displayed
			const found = this.displayLanguages.find( ( lang ) => lang.zid === newLang );
			if ( found ) {
				return;
			}
			this.displayLanguages.push( {
				zid: newLang,
				edit: this.edit,
				open: false,
				editData: this.edit ?
					this.getMultilingualDataForLanguage( newLang ).viewData :
					undefined
			} );
		},
		/**
		 * Initialize the local editable data collection for a given
		 * language block given its index.
		 *
		 * @param {number} index
		 */
		initializeEdit: function ( index ) {
			this.displayLanguages[ index ].edit = true;
			this.displayLanguages[ index ].open = true;
			this.displayLanguages[ index ].editData = JSON.parse( JSON.stringify(
				this.displayLanguageData[ index ].viewData
			) );
			this.$emit( 'edit-multilingual-data' );
		},
		/**
		 * Restores original view state and cancels publish
		 * action. This only happens when we are in a view page
		 * and after editing information, we proceed to publish
		 * and then we cancel.
		 */
		cancelPublish: function () {
			if ( this.isDirty ) {
				this.resetMultilingualData();
			}
			this.showPublishDialog = false;
		},
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
		initializeDisplayLanguages: function () {
			// 1. Always start with user language
			this.displayLanguages = [ {
				zid: this.getUserLangZid,
				edit: this.edit,
				open: true,
				editData: this.edit ?
					this.getMultilingualDataForLanguage( this.getUserLangZid ).viewData :
					undefined
			} ];

			// 2. If important info in main language is complete, exit
			let missingName = !this.fieldLangs.name.includes( this.getUserLangZid );
			let missingInputs = this.fieldLangs.inputs.filter( ( langs ) => !langs.includes( this.getUserLangZid ) );
			if ( !missingName && missingInputs.length === 0 ) {
				return;
			}

			// 3. Collect fallback languages to cover up for missing fields
			let addBlocks = [];
			for ( const langZid of this.fallbackLanguageZids ) {
				// 3.1. If everything is complete, exit loop
				if ( !missingName && missingInputs.length === 0 ) {
					break;
				}

				// 3.2. If we are still missing a fallback name, check if we have it in this language
				if ( missingName ) {
					if ( this.fieldLangs.name.includes( langZid ) ) {
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
				this.displayLanguages.push( {
					zid: langZid,
					edit: this.edit,
					open: false,
					editData: this.edit ?
						this.getMultilingualDataForLanguage( langZid ).viewData :
						undefined
				} );
			} );
		},
		/**
		 * Returns a collection fo all multilingual data fields and
		 * their values for a given language
		 *
		 * @param {string} langZid
		 * @return {Object}
		 */
		getMultilingualDataForLanguage: function ( langZid ) {
			const nameRow = this.getZPersistentName( langZid );
			const descriptionRow = this.getZPersistentDescription( langZid );
			const aliasesRow = this.getZPersistentAlias( langZid );
			const inputs = this.isFunction ? this.getInputMultilingualData( langZid ) : [];

			const data = {
				name: {
					rowId: nameRow ? nameRow.id : undefined,
					value: nameRow ? this.getZMonolingualTextValue( nameRow.id ) : ''
				},
				description: {
					rowId: descriptionRow ? descriptionRow.id : undefined,
					value: descriptionRow ? this.getZMonolingualTextValue( descriptionRow.id ) : ''
				},
				aliases: {
					rowId: aliasesRow ? aliasesRow.id : undefined,
					value: aliasesRow ? this.getZMonolingualStringsetValues( aliasesRow.id ) : []
				},
				inputs
			};

			return {
				title: this.getLabelData( langZid ).label,
				hasName: !!data.name.value,
				name: data.name.value || this.$i18n( 'wikilambda-editor-default-name' ).text(),
				viewData: data
			};
		},
		/**
		 * Returns the array of input data: its label for a given language (if any)
		 * and general input information (key, type rowId, etc.). The results are
		 * sorted by the input key.
		 *
		 * @param {string} langZid
		 * @return {Array}
		 */
		getInputMultilingualData: function ( langZid ) {
			const inputs = this.getZFunctionInputs();
			return inputs.map( ( row ) => {
				const typeRowId = this.getZArgumentTypeRowId( row.id );
				const key = this.getZArgumentKey( row.id );
				const labelRow = this.getZArgumentLabelForLanguage( row.id, langZid );
				const label = labelRow ? this.getZMonolingualTextValue( labelRow.id ) : '';
				return {
					key,
					value: label,
					inputRowId: row.id,
					labelRowId: labelRow ? labelRow.id : undefined,
					typeRowId
				};
			} ).sort( ( a, b ) => ( a.key < b.key ) ? -1 : ( b.key < a.key ) ? 1 : 0 );
		},
		/**
		 * Discards all edits and sets all language blocks to view mode.
		 */
		resetEditState: function () {
			this.displayLanguages.forEach( ( lang ) => {
				lang.edit = false;
				lang.editData = undefined;
			} );
		},
		/**
		 * Only in view pages:
		 * Persists all accummulated changes in the store and initiates publish process
		 */
		saveAllChanges: function () {
			if ( this.edit ) {
				return;
			}
			this.persistState();
			this.showPublishDialog = true;
		},
		/**
		 * Only in edit page:
		 * Persists a field change in the store and updates the page title if needed
		 */
		saveFieldChange: function () {
			if ( !this.edit ) {
				return;
			}
			this.persistState();
		},
		/**
		 * For each language being edited, persists all changes
		 * in the store.
		 */
		persistState: function () {
			this.displayLanguages.forEach( ( lang, index ) => {
				// If language block is in edit mode, persist
				// all changes that have a different edit and view value.
				if ( lang.edit ) {
					const viewData = this.displayLanguageData[ index ].viewData;
					const editData = this.displayLanguages[ index ].editData;

					// Persist name if it changed
					if ( viewData.name.value !== editData.name.value ) {
						this.persistName(
							viewData.name.rowId,
							editData.name.value,
							lang.zid
						);
					}

					// Persist description if it changed
					if ( viewData.description.value !== editData.description.value ) {
						this.persistDescription(
							viewData.description.rowId,
							editData.description.value,
							lang.zid
						);
					}

					// Persist aliases if they changed
					if (
						JSON.stringify( viewData.aliases.value ) !==
						JSON.stringify( editData.aliases.value )
					) {
						this.persistAlias(
							viewData.aliases.rowId,
							editData.aliases.value,
							lang.zid
						);
					}

					// Persist input labels if they changed
					for ( const input in editData.inputs ) {
						if ( viewData.inputs[ input ].value !== editData.inputs[ input ].value ) {
							this.persistInputLabel(
								viewData.inputs[ input ],
								editData.inputs[ input ].value,
								lang.zid
							);
						}
					}
				}
			} );
		},
		/**
		 * Persist in the global state a new value for name in the given language
		 *
		 * @param {number} rowId
		 * @param {string} value
		 * @param {string} langZid
		 */
		persistName: function ( rowId, value, langZid ) {
			const parentRowId = this.getRowByKeyPath( [
				Constants.Z_PERSISTENTOBJECT_LABEL,
				Constants.Z_MULTILINGUALSTRING_VALUE
			] ).id;
			this.persistZMonolingualString(
				parentRowId,
				rowId,
				value,
				langZid
			);
			// After persisting in the state, update the page title
			this.updatePageTitle();
		},
		/**
		 * Persist in the global state a new value for description in the given language
		 *
		 * @param {number} rowId
		 * @param {string} value
		 * @param {string} langZid
		 */
		persistDescription: function ( rowId, value, langZid ) {
			const parentRowId = this.getRowByKeyPath( [
				Constants.Z_PERSISTENTOBJECT_DESCRIPTION,
				Constants.Z_MULTILINGUALSTRING_VALUE
			] ).id;
			this.persistZMonolingualString(
				parentRowId,
				rowId,
				value,
				langZid
			);
		},
		/**
		 * Persist in the global state a new value for aliases in the given language
		 *
		 * @param {number} rowId
		 * @param {Array} values
		 * @param {string} langZid
		 */
		persistAlias: function ( rowId, values, langZid ) {
			const parentRowId = this.getRowByKeyPath( [
				Constants.Z_PERSISTENTOBJECT_ALIASES,
				Constants.Z_MULTILINGUALSTRINGSET_VALUE
			] ).id;
			this.persistZMonolingualStringset(
				parentRowId,
				rowId,
				values.map( ( a ) => a.value ),
				langZid
			);
		},
		/**
		 * Persist in the global state a new value for an input label in the given language
		 *
		 * @param {Object} inputData
		 * @param {number} inputData.inputRowId
		 * @param {number} inputData.labelRowId
		 * @param {string} value
		 * @param {string} langZid
		 */
		persistInputLabel: function ( inputData, value, langZid ) {
			const parentRowId = this.getRowByKeyPath( [
				Constants.Z_ARGUMENT_LABEL,
				Constants.Z_MULTILINGUALSTRING_VALUE
			], inputData.inputRowId ).id;
			this.persistZMonolingualString(
				parentRowId,
				inputData.labelRowId,
				value,
				langZid
			);
		},
		/**
		 * Persists ZMonolingualString changes in the data store.
		 * These can be changes to the Name/Z2K3 and Description/Z2K5 fields,
		 * as well as the input labels if the object is a function.
		 *
		 * TODO: take out into a mixin and factorize with FunctionEditor components
		 *
		 * @param {number} parentRowId identifies the parent multilingual value row Id
		 * @param {number|undefined} currentRowId identifies the current monolingual value row Id
		 * @param {string} value
		 * @param {string} langZid
		 */
		persistZMonolingualString: function ( parentRowId, currentRowId, value, langZid ) {
			this.setDirty( true );

			if ( currentRowId ) {
				if ( value === '' ) {
					this.removeItemFromTypedList( { rowId: currentRowId } );
				} else {
					this.setValueByRowIdAndPath( {
						rowId: currentRowId,
						keyPath: [
							Constants.Z_MONOLINGUALSTRING_VALUE,
							Constants.Z_STRING_VALUE
						],
						value
					} );
				}
			} else {
				// If currentRowId is null, there's no monolingual string
				// for the given language, so we create a new monolingual string
				// with the new value and append to the parent list.
				this.changeType( {
					id: parentRowId,
					type: Constants.Z_MONOLINGUALSTRING,
					lang: langZid,
					value,
					append: true
				} );
			}
		},
		/**
		 * Persists ZMonolingualStringset changes in the data store.
		 * These correspond to the Aliases/Z2K4 field.
		 *
		 * TODO: take out into a mixin and factorize with FunctionEditor components
		 *
		 * @param {number} parentRowId identifies the parent multilingual stringset value row Id
		 * @param {number|undefined} currentRowId current monolingual stringset row Id
		 * @param {Array} values list of alias to persist
		 * @param {string} langZid
		 */
		persistZMonolingualStringset: function ( parentRowId, currentRowId, values, langZid ) {
			this.setDirty( true );

			if ( currentRowId ) {
				if ( values.length === 0 ) {
					this.removeItemFromTypedList( { rowId: currentRowId } );
				} else {
					this.setValueByRowIdAndPath( {
						rowId: currentRowId,
						keyPath: [ Constants.Z_MONOLINGUALSTRINGSET_VALUE ],
						value: [ Constants.Z_STRING, ...values ]
					} );
				}
			} else {
				// If currentRowId is undefined, there's no monolingual stringset
				// for the given language, so we create a new monolingual stringset
				// with the new value and append to the parent list.
				this.changeType( {
					id: parentRowId,
					type: Constants.Z_MONOLINGUALSTRINGSET,
					lang: langZid,
					value: values,
					append: true
				} );
			}
		},
		/**
		 * Persists locally all the changes in the Language Block fields
		 *
		 * @param {Object} payload
		 * @param {Object} payload.data
		 * @param {Array|string} payload.value
		 */
		updateEditValue: function ( payload ) {
			payload.data.value = payload.value;
		},
		/**
		 * Returns special class for the accordion description
		 * depending on the availability of the title.
		 *
		 * @param {boolean} hasName
		 * @return {string}
		 */
		accordionDescriptionClass: function ( hasName ) {
			return hasName ? '' : 'ext-wikilambda-app-about__accordion--untitled';
		}
	} ),
	watch: {
		fallbackLanguageZids: function () {
			this.initializeDisplayLanguages();
		}
	},
	mounted: function () {
		this.initializeDisplayLanguages();
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

	.ext-wikilambda-app-about__button-cancel {
		margin-right: @spacing-50;
	}

	.ext-wikilambda-app-about__button-publish {
		margin-right: @spacing-25;
	}
}
</style>
