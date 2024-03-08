<!--
	WikiLambda Vue component - About Widget.

	@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
	@license MIT
-->
<template>
	<wl-widget-base class="ext-wikilambda-about">
		<!-- Widget header -->
		<template #header>
			{{ $i18n( 'wikilambda-about-widget-title' ).text() }}
		</template>
		<template #header-action>
			<cdx-button
				weight="quiet"
				aria-label="Edit"
				data-testid="open-language-dialog-button"
				:disabled="!canEditObject"
				@click="openUserLanguageDialog"
			>
				<cdx-icon :icon="icons.cdxIconEdit"></cdx-icon>
			</cdx-button>
		</template>

		<!-- Widget main -->
		<template #main>
			<div class="ext-wikilambda-about-fields">
				<!-- No descriptions or aliases message -->
				<div v-if="!hasDescription && !hasAliases" class="ext-wikilambda-about-unavailable">
					{{ $i18n( 'wikilambda-about-widget-no-descriptions-or-aliases' ).text() }}
				</div>
				<template v-else>
					<!-- Description block -->
					<div class="ext-wikilambda-about-description">
						<span v-if="hasDescription" class="ext-wikilambda-about-value">
							{{ description }}
						</span>
						<span v-else class="ext-wikilambda-about-unavailable">
							{{ $i18n( 'wikilambda-about-widget-no-descriptions' ).text() }}
						</span>
					</div>
					<!-- Aliases block -->
					<div class="ext-wikilambda-about-aliases">
						<template v-if="hasAliases">
							<span
								v-for="( alias, index ) in visibleAliases"
								:key="'alias-' + index"
								class="ext-wikilambda-about-alias"
							>
								{{ alias.value }}
							</span>
							<a
								v-if="aliases.length > 3 && !seeAllAliases"
								class="ext-wikilambda-about-aliases-more"
								@click="seeAllAliases = true"
							>+{{ aliases.length - 3 }}</a>
						</template>
						<span v-else class="ext-wikilambda-about-unavailable">
							{{ $i18n( 'wikilambda-about-widget-no-aliases' ).text() }}
						</span>
					</div>
				</template>
			</div>

			<!-- Function specific fields -->
			<div v-if="isFunction" class="ext-wikilambda-about-function-fields">
				<div class="ext-wikilambda-about-function-input">
					<!-- Inputs -->
					<div class="ext-wikilambda-about-function-field-title">
						{{ $i18n( 'wikilambda-function-definition-inputs-label' ).text() }}
					</div>
					<template v-if="inputs.length > 0">
						<div
							v-for="input in inputs"
							:key="input.key"
							class="ext-wikilambda-about-function-field-value"
						>
							<span
								class="ext-wikilambda-about-function-input-label"
								:class="{ 'ext-wikilambda-about-unavailable': !input.hasLabel }"
							>{{ input.label }}<span>:</span></span>
							<wl-z-object-to-string :row-id="input.typeRowId"></wl-z-object-to-string>
						</div>
					</template>
					<div v-else class="ext-wikilambda-about-function-field-value">
						<span class="ext-wikilambda-about-unavailable">
							{{ $i18n( 'wikilambda-about-widget-no-inputs' ).text() }}
						</span>
					</div>
				</div>
				<!-- Output -->
				<div class="ext-wikilambda-about-function-output">
					<div class="ext-wikilambda-about-function-field-title">
						{{ $i18n( 'wikilambda-function-definition-output-label' ).text() }}
					</div>
					<div class="ext-wikilambda-about-function-field-value">
						<wl-z-object-to-string :row-id="outputTypeRowId"></wl-z-object-to-string>
					</div>
				</div>
			</div>

			<!-- Dialogs -->
			<wl-about-view-languages-dialog
				:can-edit="canEditObject"
				:open="showViewLanguagesDialog"
				@open-edit-language="openEditLanguageDialog"
				@change-selected-language="changeSelectedLanguage"
				@close="showViewLanguagesDialog = false"
			>
			</wl-about-view-languages-dialog>
			<wl-about-edit-metadata-dialog
				:can-edit="canEditObject"
				:edit="edit"
				:for-language="selectedLanguage"
				:open="showEditMetadataDialog"
				:is-function="isFunction"
				@change-selected-language="changeSelectedLanguage"
				@close="showEditMetadataDialog = false"
				@publish="showPublishDialog = true"
			>
			</wl-about-edit-metadata-dialog>
			<wl-publish-dialog
				v-if="!edit"
				:show-dialog="showPublishDialog"
				@close-dialog="cancelPublish"
			></wl-publish-dialog>
		</template>

		<!-- Widget footer -->
		<template v-if="languageCount > 0" #footer>
			<div class="ext-wikilambda-about-button">
				<cdx-button @click="openViewLanguagesDialog">
					<cdx-icon :icon="icons.cdxIconLanguage"></cdx-icon>
					{{ $i18n( 'wikilambda-about-widget-language-count-button', languageCount ).text() }}
				</cdx-button>
			</div>
		</template>
	</wl-widget-base>
</template>

<script>
const Constants = require( '../../Constants.js' ),
	AboutViewLanguagesDialog = require( './AboutViewLanguagesDialog.vue' ),
	AboutEditMetadataDialog = require( './AboutEditMetadataDialog.vue' ),
	PublishDialog = require( './PublishDialog.vue' ),
	ZObjectToString = require( '../default-view-types/ZObjectToString.vue' ),
	WidgetBase = require( '../base/WidgetBase.vue' ),
	CdxButton = require( '@wikimedia/codex' ).CdxButton,
	CdxIcon = require( '@wikimedia/codex' ).CdxIcon,
	icons = require( '../../../lib/icons.json' ),
	mapActions = require( 'vuex' ).mapActions,
	mapGetters = require( 'vuex' ).mapGetters;

// @vue/component
module.exports = exports = {
	name: 'wl-about-widget',
	components: {
		'cdx-icon': CdxIcon,
		'cdx-button': CdxButton,
		'wl-about-view-languages-dialog': AboutViewLanguagesDialog,
		'wl-about-edit-metadata-dialog': AboutEditMetadataDialog,
		'wl-publish-dialog': PublishDialog,
		'wl-z-object-to-string': ZObjectToString,
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
	data: function () {
		return {
			icons: icons,
			showViewLanguagesDialog: false,
			showEditMetadataDialog: false,
			showPublishDialog: false,
			selectedLanguage: '',
			seeAllAliases: false
		};
	},
	computed: $.extend( mapGetters( [
		'getLabel',
		'getMetadataLanguages',
		'getUserLangZid',
		'getZArgumentTypeRowId',
		'getZArgumentKey',
		'getZFunctionOutput',
		'getZFunctionInputs',
		'getZMonolingualTextValue',
		'getZMonolingualStringsetValues',
		'getZPersistentAlias',
		'getZPersistentDescription',
		'isNewZObject',
		'isUserLoggedIn'
	] ), {
		/**
		 * Returns whether the user can edit the function
		 *
		 * @return {boolean}
		 */
		canEditObject: function () {
			// TODO (T301667): restrict to only certain user roles
			return this.isNewZObject ? true : this.isUserLoggedIn;
		},
		/**
		 * Returns the best Description (Z2K5) row depending
		 * on the user preferred language.
		 *
		 * @return {Object}
		 */
		selectedDescriptionObject: function () {
			return this.getZPersistentDescription();
		},
		/**
		 * Returns the best Alias (Z2K4) row depending
		 * on the user preferred language.
		 *
		 * @return {Object}
		 */
		selectedAliasesObject: function () {
			return this.getZPersistentAlias();
		},
		/**
		 * Returns the visible aliases depending on
		 * the seeAllAliases flag.
		 *
		 * @return {Array}
		 */
		visibleAliases: function () {
			return this.seeAllAliases ? this.aliases : this.aliases.slice( 0, 3 );
		},
		/**
		 * Returns whether the object has any available description
		 * (in any language)
		 *
		 * @return {boolean}
		 */
		hasDescription: function () {
			return this.selectedDescriptionObject !== undefined;
		},
		/**
		 * Returns whether the object has any available aliases
		 * (in any language)
		 *
		 * @return {boolean}
		 */
		hasAliases: function () {
			return this.selectedAliasesObject !== undefined;
		},

		/**
		 * Returns the string value for the selected description, if any
		 *
		 * @return {string}
		 */
		description: function () {
			return this.hasDescription ?
				this.getZMonolingualTextValue( this.selectedDescriptionObject.rowId ) :
				'';
		},
		/**
		 * Returns the array of strings for the selected aliases, if any
		 *
		 * @return {string}
		 */
		aliases: function () {
			return this.hasAliases ?
				this.getZMonolingualStringsetValues( this.selectedAliasesObject.rowId ) :
				[];
		},
		/**
		 * Returns a list of all the language Zids that are present
		 * in the metadata collection (must have at least a name, a
		 * description or a set of aliases).
		 *
		 * @return {Array}
		 */
		languages: function () {
			return this.getMetadataLanguages();
		},
		/**
		 * Returns the count of the list of unique metadata languages
		 *
		 * @return {number}
		 */
		languageCount: function () {
			return this.languages.length;
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
		 * Returns the rowId of the output type
		 *
		 * @return {number|undefined}
		 */
		outputTypeRowId: function () {
			if ( !this.isFunction ) {
				return undefined;
			}
			const outputTypeRow = this.getZFunctionOutput();
			return outputTypeRow ? outputTypeRow.id : undefined;
		},
		/**
		 * Returns the array of input data: its label or 'Unlabelled',
		 * its typeRowId, and whether the input has a label or not.
		 *
		 * @return {Array}
		 */
		inputs: function () {
			if ( !this.isFunction ) {
				return [];
			}
			const inputs = this.getZFunctionInputs();
			return inputs.map( ( row ) => {
				const typeRowId = this.getZArgumentTypeRowId( row.id );
				const key = this.getZArgumentKey( row.id );
				const labelData = this.getLabel( key );
				const hasLabel = labelData !== key;
				const label = hasLabel ?
					labelData :
					this.$i18n( 'wikilambda-about-widget-unlabelled-input' ).text();
				return {
					label,
					typeRowId,
					hasLabel
				};
			} );
		}
	} ),
	methods: $.extend( mapActions( [
		'resetMultilingualData'
	] ), {
		/**
		 * Opens the AboutEditMetadataDialog
		 */
		openViewLanguagesDialog: function () {
			this.showViewLanguagesDialog = true;
		},
		/**
		 * Changes the selected language to the given value
		 *
		 * @param {string} lang
		 */
		changeSelectedLanguage: function ( lang ) {
			this.selectedLanguage = lang;
		},
		/**
		 * Opens the AboutViewLanguagesDialog for the current
		 * selected language.
		 */
		openEditLanguageDialog: function () {
			this.showViewLanguagesDialog = false;
			this.showEditMetadataDialog = true;
			this.$emit( 'edit-metadata' );
		},
		/**
		 * Opens the AboutViewLanguagesDialog with the first
		 * language, which is the one with the selected Name.
		 */
		openUserLanguageDialog: function () {
			this.changeSelectedLanguage( this.getUserLangZid );
			this.openEditLanguageDialog();
		},
		/**
		 * Restores original view state and cancels publish
		 * action. This only happens when we are in a view page
		 * and after editing information, we proceed to publish
		 * and then we cancel.
		 */
		cancelPublish: function () {
			this.resetMultilingualData();
			this.showPublishDialog = false;
		}
	} )
};

</script>

<style lang="less">
@import '../../ext.wikilambda.edit.variables.less';

.ext-wikilambda-about {
	.ext-wikilambda-about-unavailable {
		color: @color-placeholder;

		& > span {
			color: @color-base;
		}
	}

	.ext-wikilambda-about-fields {
		.ext-wikilambda-about-description,
		.ext-wikilambda-about-aliases {
			margin-top: @spacing-50;
		}

		.ext-wikilambda-about-aliases {
			padding-bottom: @spacing-25;
			display: flex;
			flex-wrap: wrap;
			gap: 8px;

			.ext-wikilambda-about-alias {
				display: inline-block;
				border-radius: @border-radius-pill;
				border: 1px solid @border-color-subtle;
				color: @color-subtle;
				padding: 0 @spacing-50;
			}

			.ext-wikilambda-about-aliases-more {
				color: @color-progressive;
			}
		}
	}

	.ext-wikilambda-about-function-fields {
		margin-top: @spacing-100;
		border-top: 1px solid @border-color-subtle;

		& > div {
			margin-top: @spacing-100;
		}

		.ext-wikilambda-about-function-field-title {
			font-weight: @font-weight-bold;
		}

		.ext-wikilambda-about-function-field-value {
			margin-top: @spacing-25;
			display: flex;

			& > span {
				margin-right: @spacing-25;
			}
		}
	}

	.ext-wikilambda-about-button {
		margin-top: @spacing-125;
	}
}
</style>
