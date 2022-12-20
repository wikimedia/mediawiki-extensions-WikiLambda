<template>
	<!--
		WikiLambda Vue component for Z11/Monolingual String objects.

		@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
		@license MIT
	-->
	<div class="ext-wikilambda-monolingual-string">
		<template v-if="!edit">
			<p><span class="ext-wikilambda-lang-chip">{{ langIso }}</span> {{ text }}</p>
		</template>
		<template v-else>
			<span class="ext-wikilambda-lang-chip">{{ langIso }}</span>
			<input v-model="text" type="text">
		</template>
	</div>
</template>

<script>
var
	Constants = require( '../../Constants.js' ),
	mapGetters = require( 'vuex' ).mapGetters;

// @vue/component
module.exports = exports = {
	name: 'z-monolingual-string',
	props: {
		rowId: {
			type: Number,
			required: false,
			default: 0
		},
		edit: {
			type: Boolean,
			required: true
		}
	},
	computed: $.extend(
		mapGetters( [
			'getLabel',
			'getZObjectKeyByRowId',
			'getZMonolingualTextValue',
			'getZMonolingualLangValue'
		] ),
		{
			/**
			 * Computed value:
			 * 1. Getter gets the value from the state.
			 * 2. Setter informs the ZObjectKeyValue of the change.
			 * Only the ZObjectKeyValue responds to the 'setValue' emitted event
			 * so only the ZObjectKeyValue is doing operations to transform
			 * the state data. This is so that we don't duplicate state mutation
			 * logic all over the components, and builtin components are just
			 * visual representations and have zero logic.
			 */
			text: {
				/**
				 * Returns the terminal value of the string represented
				 * in this component.
				 *
				 * @return {string}
				 */
				get: function () {
					return this.getZMonolingualTextValue( this.rowId );
				},
				/**
				 * Emits a setValue event with the new value for the string
				 * and the key path information depending on the object key.
				 *
				 * @param {string} value
				 */
				set: function ( value ) {
					this.$emit( 'set-value', {
						keyPath: [
							Constants.Z_MONOLINGUALSTRING_VALUE,
							Constants.Z_STRING_VALUE
						],
						value
					} );
				}
			},

			/**
			 * Returns the language Zid of the Monolingual string
			 * object represented in this component.
			 * FIXME This assumes that the language is a reference,
			 * but it could be a literal. We should fix this logic
			 * for that case.
			 *
			 * @return {string}
			 */
			lang: function () {
				return this.getZMonolingualLangValue( this.rowId );
			},

			/**
			 * Returns the object { label, lang, zid } with the linguistic
			 * information of the language zid or undefined if the zid
			 * doesn't exist or wasn't found.
			 * TODO: Create Label class or interface
			 *
			 * @return {Object|undefined}
			 */
			langLabelObj: function () {
				return this.getLabel( this.lang );
			},

			/**
			 * Return the text that identifies the language in which
			 * this Monolingual String is written.
			 * TODO: Currently returns language label, but must return ISO code
			 *
			 * @return {string}
			 */
			langIso: function () {
				return this.langLabelObj ? this.langLabelObj.label : this.lang;
			}
		}
	)
};

</script>

<style lang="less">

.ext-wikilambda-monolingual-string {
	p {
		margin: 0;
	}

	span.ext-wikilambda-lang-chip {
		font-size: 0.8em;
		background: #dedede;
		padding: 2px 5px;
		border-radius: 4px;
		text-transform: uppercase;
	}
}

</style>
