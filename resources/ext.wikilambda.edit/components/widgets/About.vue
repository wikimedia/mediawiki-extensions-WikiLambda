<!--
	WikiLambda Vue component - About Widget.

	@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
	@license MIT
-->
<template>
	<wl-widget-base
		class="ext-wikilambda-about"
		:has-header-action="true"
		:has-footer-action="languageCount > 1"
	>
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
			<!-- Name block -->
			<div class="ext-wikilambda-about-fields">
				<div class="ext-wikilambda-about-name">
					<div class="ext-wikilambda-about-title">
						{{ nameLabel }}
					</div>
					<div
						class="ext-wikilambda-about-value"
						:class="{ 'ext-wikilambda-about-name-untitled': !hasName }"
					>
						{{ name }}
					</div>
				</div>
				<!-- Description block -->
				<div
					v-if="hasDescription"
					class="ext-wikilambda-about-description"
				>
					<div class="ext-wikilambda-about-title">
						{{ descriptionLabel }}
					</div>
					<div class="ext-wikilambda-about-value">
						{{ description }}
					</div>
				</div>
				<!-- Aliases block -->
				<div
					v-if="hasAliases"
					class="ext-wikilambda-about-aliases"
				>
					<div class="ext-wikilambda-about-title">
						{{ aliasesLabel }}
					</div>
					<div class="ext-wikilambda-about-value">
						<span
							v-for="( alias, index ) in aliases"
							:key="'alias-' + index"
						>
							<span v-if="index !== 0">, </span>{{ alias.value }}
						</span>
					</div>
				</div>
			</div>
			<!-- Dialogs -->
			<wl-about-view-languages-dialog
				:open="showViewLanguagesDialog"
				@open-edit-language="openEditLanguageDialog"
				@change-selected-language="changeSelectedLanguage"
				@close="showViewLanguagesDialog = false"
			>
			</wl-about-view-languages-dialog>
			<wl-about-edit-metadata-dialog
				:edit="edit"
				:for-language="selectedLanguage"
				:open="showEditMetadataDialog"
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
		<template v-if="languageCount > 1" #footer>
			<div
				v-if="languageCount > 1"
				class="ext-wikilambda-content-buttons"
			>
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
		'wl-widget-base': WidgetBase
	},
	props: {
		edit: {
			type: Boolean,
			required: true
		}
	},
	data: function () {
		return {
			icons: icons,
			showViewLanguagesDialog: false,
			showEditMetadataDialog: false,
			showPublishDialog: false,
			selectedLanguage: ''
		};
	},
	computed: $.extend( mapGetters( [
		'getLabel',
		'getMetadataLanguages',
		'getUserZlangZID',
		'getZMonolingualTextValue',
		'getZMonolingualStringsetValues',
		'getZPersistentAlias',
		'getZPersistentDescription',
		'getZPersistentName',
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
		 * Returns the best Name/Label (Z2K3) row depending
		 * on the user preferred language.
		 *
		 * @return {Object}
		 */
		selectedNameObject: function () {
			return this.getZPersistentName();
		},
		/**
		 * Returns the best Name/Label (Z2K5) row depending
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
		 * Returns whether the object has any available name
		 * object (in any language). The object could have an
		 * empty string.
		 *
		 * @return {boolean}
		 */
		hasNameObject: function () {
			return this.selectedNameObject !== undefined;
		},
		/**
		 * Returns whether the object has any available name
		 * (in any language).
		 *
		 * @return {boolean}
		 */
		hasName: function () {
			return !!this.nameValue;
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
		 * Returns the value of the selected name object, if any.
		 * It can return an empty string.
		 *
		 * @return {string}
		 */
		nameValue: function () {
			return this.hasNameObject ?
				this.getZMonolingualTextValue( this.selectedNameObject.rowId ) :
				'';
		},
		/**
		 * Returns the string value to present as the name, if any, or "Untitled"
		 * if no name object is present or the name object has an empty string.
		 *
		 * @return {string}
		 */
		name: function () {
			return this.hasName ?
				this.getZMonolingualTextValue( this.selectedNameObject.rowId ) :
				this.$i18n( 'wikilambda-editor-default-name' ).text();
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
		 * Returns the label for the name input field (Z2K3)
		 *
		 * @return {string}
		 */
		nameLabel: function () {
			return this.getLabel( Constants.Z_PERSISTENTOBJECT_LABEL );
		},
		/**
		 * Returns the label for the description input field (Z2K5)
		 *
		 * @return {string}
		 */
		descriptionLabel: function () {
			return this.getLabel( Constants.Z_PERSISTENTOBJECT_DESCRIPTION );
		},
		/**
		 * Returns the label for the aliases input field (Z2K4)
		 *
		 * @return {string}
		 */
		aliasesLabel: function () {
			return this.getLabel( Constants.Z_PERSISTENTOBJECT_ALIASES );
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
		},
		/**
		 * Opens the AboutViewLanguagesDialog with the first
		 * language, which is the one with the selected Name.
		 */
		openUserLanguageDialog: function () {
			this.changeSelectedLanguage( this.getUserZlangZID );
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
@import '../../ext.wikilambda.edit.less';

.ext-wikilambda-about-fields {
	& > div {
		margin-bottom: @spacing-100;

		&:last-child {
			margin-bottom: 0;
		}
	}

	.ext-wikilambda-about-title {
		color: @color-base;
		font-weight: @font-weight-bold;
	}

	.ext-wikilambda-about-value {
		&.ext-wikilambda-about-name-untitled {
			color: @color-placeholder;
		}
	}
}
</style>
