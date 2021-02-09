<template>
	<!--
		WikiLambda Vue component for editing multilingual text

		@copyright 2020–2021 WikiLambda team; see AUTHORS.txt
		@license MIT
	-->
	<div class="ext-wikilambda-multilingual">
		<div
			v-for="(z11Object, index) in monolingualStrings"
			:key="z11Object[ Constants.Z_MONOLINGUALSTRING_LANGUAGE ]"
			class="ext-wikilambda-monolingual"
		>
			<div class="ext-wikilambda-cell">
				<button
					v-if="!viewmode"
					:title="tooltipRemoveLang"
					@click="removeLang( index )"
				>
					{{ $i18n( 'wikilambda-editor-removeitem' ) }}
				</button>
				{{ allLangs[ z11Object[ Constants.Z_MONOLINGUALSTRING_LANGUAGE ] ] }}
				({{ z11Object[ Constants.Z_MONOLINGUALSTRING_LANGUAGE ] }}):
			</div>
			<div class="ext-wikilambda-cell">
				<span
					v-if="viewmode"
					class="ext-wikilambda-zstring"
				>
					{{ z11Object[ Constants.Z_MONOLINGUALSTRING_VALUE ] }}
				</span>
				<input
					v-else
					class="ext-wikilambda-zstring"
					:value="z11Object[ Constants.Z_MONOLINGUALSTRING_VALUE ]"
					@change="updateLangString( $event, index )"
				>
			</div>
		</div>
		<div class="ext-wikilambda-monolingual">
			<select v-if="!viewmode"
				:value="selectedLang"
				@change="addNewLang"
			>
				<option
					selected
					disabled
					value="None"
				>
					{{ $i18n( 'wikilambda-editor-label-addlanguage-label' ) }}
				</option>
				<option
					v-for="(langName, langId) in unusedLangList"
					:key="langId"
					:value="langId"
				>
					{{ langName }} ({{ langId }})
				</option>
			</select>
		</div>
	</div>
</template>

<script>
var Constants = require( '../../Constants.js' ),
	mapState = require( 'vuex' ).mapState,
	mapActions = require( 'vuex' ).mapActions;

module.exports = {
	name: 'ZMultilingualString',
	props: {
		zobject: {
			type: Object,
			required: true
		},
		viewmode: {
			type: Boolean,
			required: true
		}
	},
	data: function () {
		return {
			Constants: Constants
		};
	},
	computed: $.extend( {},
		mapState( [ 'allLangs' ] ),
		{
			monolingualStrings: function () {
				var monoStrings = [];
				if ( Constants.Z_MULTILINGUALSTRING_VALUE in this.zobject ) {
					monoStrings = this.zobject[ Constants.Z_MULTILINGUALSTRING_VALUE ];
				}
				return monoStrings;
			},
			tooltipRemoveLang: function () {
				return this.$i18n( 'wikilambda-editor-label-removelanguage-tooltip' );
			},
			selectedLang: function () {
				return 'None';
			},
			unusedLangList: function () {
				var langCode,
					unusedLangList = {};

				for ( langCode in this.allLangs ) {
					unusedLangList[ langCode ] = this.allLangs[ langCode ];
				}
				if ( Constants.Z_MULTILINGUALSTRING_VALUE in this.zobject ) {
					this.zobject[ Constants.Z_MULTILINGUALSTRING_VALUE ].forEach(
						function ( z11Object ) {
							langCode = z11Object[ Constants.Z_MONOLINGUALSTRING_LANGUAGE ];
							delete unusedLangList[ langCode ];
						}
					);
				}
				return unusedLangList;
			}
		}
	),
	methods: $.extend( {},
		mapActions( [ 'fetchAllLangs' ] ),
		{
			/**
			 * Fires a `change` event with the index of a Monolingual String
			 * and its new string value.
			 *
			 * @param {Event} event
			 * @param {number} index
			 */
			updateLangString: function ( event, index ) {
				this.$emit( 'change', {
					index: index,
					value: event.target.value
				} );
			},

			/**
			 * Fires an `add-lang` event with the language code of the new
			 * Monolingual String to add to the Multilingual String.
			 *
			 * @param {Event} event
			 */
			addNewLang: function ( event ) {
				var lang = event.target.value;
				this.$emit( 'add-lang', lang );
			},

			/**
			 * Fires a `delete-lang` event with the index of the Monolingual String
			 * to be removed.
			 *
			 * @param {number} index
			 * @fires delete-lang
			 */
			removeLang: function ( index ) {
				this.$emit( 'delete-lang', index );
			}
		}
	),
	created: function () {
		this.fetchAllLangs();
	}
};
</script>

<style lang="less">
.ext-wikilambda-multilingual {
	display: block;
	padding: 1em;
	background: #efe;
	outline: 1px dashed #888;
}

.ext-wikilambda-monolingual {
	clear: both;
}

.ext-wikilambda-cell {
	float: left;
	padding: 0;

	.ext-wikilambda-zstring {
		vertical-align: bottom;
		margin-left: 0.5em;
		margin-top: 4px;
	}
}
</style>
