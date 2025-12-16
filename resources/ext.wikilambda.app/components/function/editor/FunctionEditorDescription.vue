<!--
	WikiLambda Vue component for setting the description of a ZFunction in the Function editor.

	@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
	@license MIT
-->
<template>
	<wl-function-editor-field class="ext-wikilambda-app-function-editor-description">
		<template #label>
			<label :for="descriptionInputId">
				<!-- TODO (T335583): Replace i18n message with key label -->
				{{ i18n( 'wikilambda-function-definition-description-label' ).text() }}
				<span>{{ i18n( 'parentheses', [ i18n( 'wikilambda-optional' ).text() ] ).text() }}</span>
			</label>
		</template>
		<template #body>
			<cdx-text-area
				:id="descriptionInputId"
				:lang="description ? langLabelData.langCode : undefined"
				:dir="description ? langLabelData.langDir : undefined"
				:model-value="description ? description.value : ''"
				class="ext-wikilambda-app-function-editor-description__input"
				:aria-label="i18n( 'wikilambda-function-definition-description-label' ).text()"
				:placeholder="i18n( 'wikilambda-function-definition-description-placeholder' ).text()"
				:maxlength="maxDescriptionChars"
				@input="updateRemainingChars"
				@change="persistDescription"
			></cdx-text-area>
			<div class="ext-wikilambda-app-function-editor-description__counter">
				{{ remainingChars }}
			</div>
		</template>
	</wl-function-editor-field>
</template>

<script>
const { computed, defineComponent, inject, onBeforeUnmount, onMounted, ref } = require( 'vue' );
const Constants = require( '../../../Constants.js' );
const LabelData = require( '../../../store/classes/LabelData.js' );
const useMainStore = require( '../../../store/index.js' );

// Function editor components
const FunctionEditorField = require( './FunctionEditorField.vue' );
// Codex components
const { CdxTextArea } = require( '../../../../codex.js' );

module.exports = exports = defineComponent( {
	name: 'wl-function-editor-description',
	components: {
		'wl-function-editor-field': FunctionEditorField,
		'cdx-text-area': CdxTextArea
	},
	props: {
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
	emits: [ 'description-updated' ],
	setup( props, { emit } ) {
		const i18n = inject( 'i18n' );
		const store = useMainStore();

		// Constants
		const maxDescriptionChars = Constants.DESCRIPTION_CHARS_MAX;

		// State
		const ignoreChangeEvent = ref( false );
		const remainingChars = ref( Constants.DESCRIPTION_CHARS_MAX );

		// Description data
		/**
		 * Finds the Description (Z2K5) for the given language
		 *
		 * @return {Object|undefined}
		 */
		const description = computed( () => props.zLanguage ?
			store.getZPersistentDescription( props.zLanguage ) :
			undefined
		);

		/**
		 * Returns the id for the input field
		 *
		 * @return {string}
		 */
		const descriptionInputId = computed( () => `ext-wikilambda-app-function-editor-description__input${ props.zLanguage }` );

		// Actions
		/**
		 * Updates the remainingChars as the user types
		 *
		 * @param {Event} event
		 */
		function updateRemainingChars( event ) {
			const { length } = event.target.value;
			remainingChars.value = maxDescriptionChars - length;
		}

		/**
		 * Persist the new description value in the store
		 *
		 * @param {Object} event
		 */
		function persistDescription( event ) {
			if ( ignoreChangeEvent.value ) {
				return;
			}

			store.setZMonolingualString( {
				parentKeyPath: [
					Constants.STORED_OBJECTS.MAIN,
					Constants.Z_PERSISTENTOBJECT_DESCRIPTION,
					Constants.Z_MULTILINGUALSTRING_VALUE
				],
				itemKeyPath: description.value ? description.value.keyPath : undefined,
				value: event.target.value,
				lang: props.zLanguage
			} );

			emit( 'description-updated' );
		}

		// Lifecycle
		onMounted( () => {
			remainingChars.value = maxDescriptionChars - ( description.value ? description.value.value.length : 0 );
		} );

		onBeforeUnmount( () => {
			// When the component is unmounted, we want to ignore any change events
			ignoreChangeEvent.value = true;
		} );

		return {
			description,
			descriptionInputId,
			i18n,
			maxDescriptionChars,
			persistDescription,
			remainingChars,
			updateRemainingChars
		};
	}
} );
</script>

<style lang="less">
@import '../../../ext.wikilambda.app.variables.less';

.ext-wikilambda-app-function-editor-description {
	.ext-wikilambda-app-function-editor-description__counter {
		color: @color-subtle;
		margin-left: @spacing-50;
		display: flex;
		justify-content: flex-end;
	}
}
</style>
