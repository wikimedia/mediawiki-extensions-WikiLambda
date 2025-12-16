<!--
	WikiLambda Vue component for setting the name of a ZFunction in the Function editor.

	@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
	@license MIT
-->
<template>
	<wl-function-editor-field class="ext-wikilambda-app-function-editor-name">
		<template #label>
			<label :for="nameFieldId">
				<!-- TODO (T335583): Replace i18n message with key label -->
				{{ i18n( 'wikilambda-function-definition-name-label' ).text() }}
				<span>{{ i18n( 'parentheses', [ i18n( 'wikilambda-optional' ).text() ] ).text() }}</span>
			</label>
		</template>
		<template #body>
			<cdx-text-input
				:id="nameFieldId"
				:lang="name ? langLabelData.langCode : undefined"
				:dir="name ? langLabelData.langDir : undefined"
				:model-value="name ? name.value : ''"
				class="ext-wikilambda-app-function-editor-name__input"
				:aria-label="i18n( 'wikilambda-function-definition-name-label' ).text()"
				:placeholder="i18n( 'wikilambda-function-definition-name-placeholder' ).text()"
				:maxlength="maxLabelChars"
				@input="updateRemainingChars"
				@change="persistName"
			></cdx-text-input>
			<div class="ext-wikilambda-app-function-editor-name__counter">
				{{ remainingChars }}
			</div>
		</template>
	</wl-function-editor-field>
</template>

<script>
const { computed, defineComponent, inject, onBeforeUnmount, onMounted, ref } = require( 'vue' );

const Constants = require( '../../../Constants.js' );
const useMainStore = require( '../../../store/index.js' );
const LabelData = require( '../../../store/classes/LabelData.js' );
const usePageTitle = require( '../../../composables/usePageTitle.js' );

// Function editor components
const FunctionEditorField = require( './FunctionEditorField.vue' );
// Codex components
const { CdxTextInput } = require( '../../../../codex.js' );

module.exports = exports = defineComponent( {
	name: 'wl-function-editor-name',
	components: {
		'wl-function-editor-field': FunctionEditorField,
		'cdx-text-input': CdxTextInput
	},
	props: {
		/**
		 * zID of item label language
		 *
		 * @example Z1014
		 */
		zLanguage: {
			type: String,
			required: true
		},
		/**
		 * Label data for the language
		 */
		langLabelData: {
			type: LabelData,
			default: null
		}
	},
	emits: [ 'name-updated' ],
	setup( props, { emit } ) {
		const i18n = inject( 'i18n' );
		const store = useMainStore();
		const { updatePageTitle } = usePageTitle();

		// Constants
		const maxLabelChars = Constants.LABEL_CHARS_MAX;

		// State
		const ignoreChangeEvent = ref( false );
		const remainingChars = ref( Constants.LABEL_CHARS_MAX );

		// Name data
		/**
		 * Finds the Name (Z2K3) for the given language and returns
		 * its keyPath and value if found. Else, returns undefined.
		 *
		 * @return {Object|undefined}
		 */
		const name = computed( () => props.zLanguage ? store.getZPersistentName( props.zLanguage ) : undefined );

		/**
		 * Returns the id for the input field
		 *
		 * @return {string}
		 */
		const nameFieldId = computed( () => `ext-wikilambda-app-function-editor-name__input-${ props.zLanguage }` );

		// Actions
		/**
		 * Updates the remainingChars data property as the user types into the Z2K5 field
		 *
		 * @param {Event} event - the event object that is automatically passed in on input
		 */
		function updateRemainingChars( event ) {
			const { length } = event.target.value;
			remainingChars.value = maxLabelChars - length;
		}

		/**
		 * Persist the new name value in the globally stored object
		 *
		 * @param {Object} event
		 */
		function persistName( event ) {
			if ( ignoreChangeEvent.value ) {
				return;
			}

			store.setZMonolingualString( {
				parentKeyPath: [
					Constants.STORED_OBJECTS.MAIN,
					Constants.Z_PERSISTENTOBJECT_LABEL,
					Constants.Z_MULTILINGUALSTRING_VALUE
				],
				itemKeyPath: name.value ? name.value.keyPath : undefined,
				value: event.target.value,
				lang: props.zLanguage
			} );

			// After persisting in the state, update the page title
			updatePageTitle();
			emit( 'name-updated' );
		}

		// Lifecycle
		onMounted( () => {
			remainingChars.value = maxLabelChars - ( name.value ? name.value.value.length : 0 );
		} );

		onBeforeUnmount( () => {
			// When the component is unmounted, we want to ignore any change events and not persist the data
			ignoreChangeEvent.value = true;
		} );

		// Return all properties and methods for the template
		return {
			i18n,
			maxLabelChars,
			name,
			nameFieldId,
			persistName,
			remainingChars,
			updateRemainingChars
		};
	}
} );
</script>

<style lang="less">
@import '../../../ext.wikilambda.app.variables.less';

.ext-wikilambda-app-function-editor-name {
	.ext-wikilambda-app-function-editor-name__counter {
		color: @color-subtle;
		margin-left: @spacing-50;
		display: flex;
		justify-content: flex-end;
	}
}
</style>
